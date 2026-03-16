import asyncHandler from "express-async-handler";
import AuditLog from "../models/auditLogModel.js";

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

  // Build filter object
  const filter = {};
  if (resource) filter.resource = resource;
  if (resource_id) filter.resource_id = resource_id;
  if (changed_by) filter.changed_by = changed_by;
  if (action) filter.action = action;
  if (start_date || end_date) {
    filter.changed_at = {};
    if (start_date) filter.changed_at.$gte = new Date(start_date);
    if (end_date) filter.changed_at.$lte = new Date(end_date);
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

  res.status(200).json({
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum),
    data: logs,
  });
});
