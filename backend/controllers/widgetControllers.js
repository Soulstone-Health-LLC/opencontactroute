import asyncHandler from "express-async-handler";
import Audience from "../models/audienceModel.js";
import Plan from "../models/planModel.js";
import Topic from "../models/topicModel.js";
import ContactPathway from "../models/contactPathwayModel.js";
import PathwayEvent from "../models/pathwayEventModel.js";

// ─── GET AUDIENCES ────────────────────────────────────────────────────────────
// @desc    List active audiences for widget step 1
// @route   GET /api/v1/widget/audiences
// @access  Public
export const getWidgetAudiences = asyncHandler(async (req, res) => {
  const audiences = await Audience.find({ is_active: true })
    .select("name slug description sort_order")
    .sort({ sort_order: 1, name: 1 });

  res.status(200).json(audiences);
});

// ─── GET PLANS ────────────────────────────────────────────────────────────────
// @desc    List active plans for a given audience (must have ≥1 published pathway)
// @route   GET /api/v1/widget/plans?audience=<id>
// @access  Public
export const getWidgetPlans = asyncHandler(async (req, res) => {
  const { audience } = req.query;

  if (!audience) {
    res.status(400);
    throw new Error("audience query parameter is required");
  }

  // Find distinct plan_ids that have at least one published pathway for this audience
  const publishedPlanIds = await ContactPathway.distinct("plan_id", {
    audience_id: audience,
    status: "published",
  });

  const plans = await Plan.find({
    _id: { $in: publishedPlanIds },
    is_active: true,
  })
    .select("name slug description sort_order")
    .sort({ sort_order: 1, name: 1 });

  res.status(200).json(plans);
});

// ─── GET TOPICS ───────────────────────────────────────────────────────────────
// @desc    List active topics for a given audience + plan (must have ≥1 published pathway)
// @route   GET /api/v1/widget/topics?audience=<id>&plan=<id>
// @access  Public
export const getWidgetTopics = asyncHandler(async (req, res) => {
  const { audience, plan } = req.query;

  if (!audience || !plan) {
    res.status(400);
    throw new Error("audience and plan query parameters are required");
  }

  // Find distinct topic_ids that have at least one published pathway for this audience + plan
  const publishedTopicIds = await ContactPathway.distinct("topic_id", {
    audience_id: audience,
    plan_id: plan,
    status: "published",
  });

  const topics = await Topic.find({
    _id: { $in: publishedTopicIds },
    is_active: true,
  })
    .select("name slug description sort_order")
    .sort({ sort_order: 1, name: 1 });

  res.status(200).json(topics);
});

// ─── GET PATHWAY ──────────────────────────────────────────────────────────────
// @desc    Retrieve the published pathway for a given audience + plan + topic
// @route   GET /api/v1/widget/pathway?audience=<id>&plan=<id>&topic=<id>
// @access  Public
export const getWidgetPathway = asyncHandler(async (req, res) => {
  const { audience, plan, topic } = req.query;

  if (!audience || !plan || !topic) {
    res.status(400);
    throw new Error("audience, plan, and topic query parameters are required");
  }

  const pathway = await ContactPathway.findOne({
    audience_id: audience,
    plan_id: plan,
    topic_id: topic,
    status: "published",
  })
    .populate("audience_id", "name slug")
    .populate("plan_id", "name slug")
    .populate("topic_id", "name slug");

  if (!pathway) {
    res.status(404);
    throw new Error("No published pathway found for this combination");
  }

  res.status(200).json(pathway);
});

// ─── RECORD EVENT ─────────────────────────────────────────────────────────────
// @desc    Record a PathwayEvent when the consumer widget displays a pathway
// @route   POST /api/v1/widget/event
// @access  Public
export const recordWidgetEvent = asyncHandler(async (req, res) => {
  const { pathway_id, audience_id, plan_id, topic_id, embed_source } = req.body;

  if (!pathway_id || !audience_id || !plan_id || !topic_id) {
    res.status(400);
    throw new Error(
      "pathway_id, audience_id, plan_id, and topic_id are required",
    );
  }

  const event = await PathwayEvent.create({
    pathway_id,
    audience_id,
    plan_id,
    topic_id,
    embed_source: embed_source?.trim() || undefined,
  });

  res.status(201).json(event);
});
