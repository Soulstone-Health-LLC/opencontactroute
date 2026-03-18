import asyncHandler from "express-async-handler";
import AuditLog from "../models/auditLogModel.js";
import PathwayEvent from "../models/pathwayEventModel.js";
import ContactPathway from "../models/contactPathwayModel.js";
import Audience from "../models/audienceModel.js";
import Plan from "../models/planModel.js";
import Topic from "../models/topicModel.js";

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────

// Build a date range filter for PathwayEvent.occurred_at.
// Defaults to the last 30 days when no dates are supplied.
// Accepts full ISO-8601 strings (sent by the frontend with local-TZ bounds)
// or plain YYYY-MM-DD strings (direct API consumers) — plain end dates are
// treated as end-of-UTC-day so the full day is included.
const parseStartDate = (s) => new Date(s);
const parseEndDate = (s) => {
  const d = new Date(s);
  if (!s.includes("T")) d.setUTCHours(23, 59, 59, 999);
  return d;
};

const buildDateFilter = (start_date, end_date) => {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);

  return {
    $gte: start_date ? parseStartDate(start_date) : defaultStart,
    $lte: end_date ? parseEndDate(end_date) : now,
  };
};

// ─── GET AUDIT LOG ────────────────────────────────────────────────────────────
// @desc    Get paginated audit log entries with optional filters
// @route   GET /api/v1/reports/audit-log
// @access  Admin
export const getAuditLog = asyncHandler(async (req, res) => {
  const {
    resource,
    resource_id,
    changed_by,
    action,
    start_date,
    end_date,
    page = 1,
    limit = 25,
  } = req.query;

  const filter = {};
  if (resource) filter.resource = resource;
  if (resource_id) filter.resource_id = resource_id;
  if (changed_by) filter.changed_by = changed_by;
  if (action) filter.action = action;
  if (start_date || end_date) {
    filter.changed_at = {};
    if (start_date) filter.changed_at.$gte = parseStartDate(start_date);
    if (end_date) filter.changed_at.$lte = parseEndDate(end_date);
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("changed_by", "email")
      .sort({ changed_at: -1 })
      .skip(skip)
      .limit(limitNum),
    AuditLog.countDocuments(filter),
  ]);

  const SENSITIVE_FIELDS = new Set(["password_hash"]);

  res.status(200).json({
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
    data: logs.map((log) => {
      const obj = log.toObject();
      obj.changes = obj.changes.map((c) =>
        SENSITIVE_FIELDS.has(c.field)
          ? { ...c, old_value: "[redacted]", new_value: "[redacted]" }
          : c,
      );
      return obj;
    }),
  });
});

// ─── PATHWAY VIEWS OVER TIME ──────────────────────────────────────────────────
// @desc    Pathway view counts grouped by day, week, or month
// @route   GET /api/v1/reports/pathway-views
// @access  Private
// @query   start_date, end_date, group_by (day|week|month, default: day)
export const getPathwayViews = asyncHandler(async (req, res) => {
  const { start_date, end_date, group_by = "day" } = req.query;

  const dateFilter = buildDateFilter(start_date, end_date);

  // Map group_by to MongoDB date truncation expressions
  const groupFormats = {
    day: { $dateToString: { format: "%Y-%m-%d", date: "$occurred_at" } },
    week: { $dateToString: { format: "%Y-W%V", date: "$occurred_at" } },
    month: { $dateToString: { format: "%Y-%m", date: "$occurred_at" } },
  };

  const dateExpr = groupFormats[group_by] ?? groupFormats.day;

  const results = await PathwayEvent.aggregate([
    { $match: { occurred_at: dateFilter } },
    { $group: { _id: dateExpr, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: "$_id", count: 1 } },
  ]);

  res.status(200).json({
    group_by,
    start_date: dateFilter.$gte,
    end_date: dateFilter.$lte,
    data: results,
  });
});

// ─── TOP PATHWAYS ─────────────────────────────────────────────────────────────
// @desc    Most frequently accessed pathways ranked by view count
// @route   GET /api/v1/reports/top-pathways
// @access  Private
// @query   start_date, end_date, limit (default: 10)
export const getTopPathways = asyncHandler(async (req, res) => {
  const { start_date, end_date, limit = 10 } = req.query;

  const dateFilter = buildDateFilter(start_date, end_date);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const results = await PathwayEvent.aggregate([
    { $match: { occurred_at: dateFilter } },
    { $group: { _id: "$pathway_id", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limitNum },
    {
      $lookup: {
        from: "contactpathways",
        localField: "_id",
        foreignField: "_id",
        as: "pathway",
      },
    },
    { $unwind: { path: "$pathway", preserveNullAndEmptyArrays: false } },
    {
      $lookup: {
        from: "audiences",
        localField: "pathway.audience_id",
        foreignField: "_id",
        as: "pathway.audience",
      },
    },
    {
      $unwind: { path: "$pathway.audience", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "plans",
        localField: "pathway.plan_id",
        foreignField: "_id",
        as: "pathway.plan",
      },
    },
    { $unwind: { path: "$pathway.plan", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "topics",
        localField: "pathway.topic_id",
        foreignField: "_id",
        as: "pathway.topic",
      },
    },
    { $unwind: { path: "$pathway.topic", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        count: 1,
        pathway_id: "$_id",
        department: "$pathway.department",
        status: "$pathway.status",
        audience: {
          _id: "$pathway.audience._id",
          name: "$pathway.audience.name",
          slug: "$pathway.audience.slug",
        },
        plan: {
          _id: "$pathway.plan._id",
          name: "$pathway.plan.name",
          slug: "$pathway.plan.slug",
        },
        topic: {
          _id: "$pathway.topic._id",
          name: "$pathway.topic.name",
          slug: "$pathway.topic.slug",
        },
      },
    },
  ]);

  res.status(200).json({
    start_date: dateFilter.$gte,
    end_date: dateFilter.$lte,
    data: results,
  });
});

// ─── TOP TOPICS ───────────────────────────────────────────────────────────────
// @desc    Most frequently selected support topics
// @route   GET /api/v1/reports/top-topics
// @access  Private
// @query   start_date, end_date, limit (default: 10)
export const getTopTopics = asyncHandler(async (req, res) => {
  const { start_date, end_date, limit = 10 } = req.query;

  const dateFilter = buildDateFilter(start_date, end_date);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const results = await PathwayEvent.aggregate([
    { $match: { occurred_at: dateFilter } },
    { $group: { _id: "$topic_id", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limitNum },
    {
      $lookup: {
        from: "topics",
        localField: "_id",
        foreignField: "_id",
        as: "topic",
      },
    },
    { $unwind: { path: "$topic", preserveNullAndEmptyArrays: false } },
    {
      $project: {
        _id: 0,
        count: 1,
        topic: { _id: "$topic._id", name: "$topic.name", slug: "$topic.slug" },
      },
    },
  ]);

  res.status(200).json({
    start_date: dateFilter.$gte,
    end_date: dateFilter.$lte,
    data: results,
  });
});

// ─── TOP AUDIENCES ────────────────────────────────────────────────────────────
// @desc    Most frequently selected audience types
// @route   GET /api/v1/reports/top-audiences
// @access  Private
// @query   start_date, end_date, limit (default: 10)
export const getTopAudiences = asyncHandler(async (req, res) => {
  const { start_date, end_date, limit = 10 } = req.query;

  const dateFilter = buildDateFilter(start_date, end_date);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const results = await PathwayEvent.aggregate([
    { $match: { occurred_at: dateFilter } },
    { $group: { _id: "$audience_id", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limitNum },
    {
      $lookup: {
        from: "audiences",
        localField: "_id",
        foreignField: "_id",
        as: "audience",
      },
    },
    { $unwind: { path: "$audience", preserveNullAndEmptyArrays: false } },
    {
      $project: {
        _id: 0,
        count: 1,
        audience: {
          _id: "$audience._id",
          name: "$audience.name",
          slug: "$audience.slug",
        },
      },
    },
  ]);

  res.status(200).json({
    start_date: dateFilter.$gte,
    end_date: dateFilter.$lte,
    data: results,
  });
});

// ─── TOP PLANS ────────────────────────────────────────────────────────────────
// @desc    Most frequently selected plan/network types
// @route   GET /api/v1/reports/top-plans
// @access  Private
// @query   start_date, end_date, limit (default: 10)
export const getTopPlans = asyncHandler(async (req, res) => {
  const { start_date, end_date, limit = 10 } = req.query;

  const dateFilter = buildDateFilter(start_date, end_date);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

  const results = await PathwayEvent.aggregate([
    { $match: { occurred_at: dateFilter } },
    { $group: { _id: "$plan_id", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limitNum },
    {
      $lookup: {
        from: "plans",
        localField: "_id",
        foreignField: "_id",
        as: "plan",
      },
    },
    { $unwind: { path: "$plan", preserveNullAndEmptyArrays: false } },
    {
      $project: {
        _id: 0,
        count: 1,
        plan: { _id: "$plan._id", name: "$plan.name", slug: "$plan.slug" },
      },
    },
  ]);

  res.status(200).json({
    start_date: dateFilter.$gte,
    end_date: dateFilter.$lte,
    data: results,
  });
});

// ─── PATHWAY COVERAGE ────────────────────────────────────────────────────────
// @desc    Coverage summary for all active audience+plan+topic combinations
// @route   GET /api/v1/reports/pathway-coverage
// @access  Private
export const getPathwayCoverage = asyncHandler(async (req, res) => {
  const [audiences, plans, topics, pathways] = await Promise.all([
    Audience.find({ is_active: true }).select("_id name slug").lean(),
    Plan.find({ is_active: true }).select("_id name slug").lean(),
    Topic.find({ is_active: true }).select("_id name slug").lean(),
    ContactPathway.find({})
      .select("audience_id plan_id topic_id status department")
      .lean(),
  ]);

  const total_possible = audiences.length * plans.length * topics.length;

  // Index existing pathways by compound key for O(1) lookup
  const pathwayMap = new Map();
  for (const p of pathways) {
    const key = `${p.audience_id}_${p.plan_id}_${p.topic_id}`;
    pathwayMap.set(key, p);
  }

  let published = 0;
  let draft = 0;
  let uncovered = 0;
  const published_combinations = [];
  const draft_combinations = [];
  const uncovered_combinations = [];

  for (const audience of audiences) {
    for (const plan of plans) {
      for (const topic of topics) {
        const key = `${audience._id}_${plan._id}_${topic._id}`;
        const pathway = pathwayMap.get(key);
        const combo = {
          audience: {
            _id: audience._id,
            name: audience.name,
            slug: audience.slug,
          },
          plan: { _id: plan._id, name: plan.name, slug: plan.slug },
          topic: { _id: topic._id, name: topic.name, slug: topic.slug },
        };
        if (!pathway) {
          uncovered++;
          uncovered_combinations.push(combo);
        } else if (pathway.status === "published") {
          published++;
          published_combinations.push({
            ...combo,
            pathway_id: pathway._id,
            department: pathway.department ?? null,
          });
        } else {
          draft++;
          draft_combinations.push({
            ...combo,
            pathway_id: pathway._id,
            department: pathway.department ?? null,
          });
        }
      }
    }
  }

  res.status(200).json({
    total_possible,
    published,
    draft,
    uncovered,
    published_combinations,
    draft_combinations,
    uncovered_combinations,
  });
});

// ─── CONTENT AUDIT ────────────────────────────────────────────────────────────
// @desc    All pathways with status, last updated, last updated by
// @route   GET /api/v1/reports/content-audit
// @access  Private
// @query   status (draft|published), page, limit
export const getContentAudit = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 25 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [pathways, total] = await Promise.all([
    ContactPathway.find(filter)
      .select(
        "audience_id plan_id topic_id department status published_at updated_by updatedAt",
      )
      .populate("audience_id", "name slug")
      .populate("plan_id", "name slug")
      .populate("topic_id", "name slug")
      .populate("updated_by", "email")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    ContactPathway.countDocuments(filter),
  ]);

  res.status(200).json({
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
    data: pathways,
  });
});
