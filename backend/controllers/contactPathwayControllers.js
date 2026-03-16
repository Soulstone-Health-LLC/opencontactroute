import asyncHandler from "express-async-handler";
import ContactPathway from "../models/contactPathwayModel.js";

// ─── CREATE PATHWAY ───────────────────────────────────────────────────────────
// @desc    Create a new contact pathway (default status: draft)
// @route   POST /api/v1/pathways
// @access  Admin, Super User
export const createPathway = asyncHandler(async (req, res) => {
  const {
    audience_id,
    plan_id,
    topic_id,
    department,
    phone,
    ivr_steps,
    portal_url,
    email,
    fax,
    notes,
    is_delegated,
    vendor_name,
  } = req.body;

  if (!audience_id || !plan_id || !topic_id) {
    res.status(400);
    throw new Error("audience_id, plan_id, and topic_id are required");
  }

  // is_delegated requires vendor_name
  if (is_delegated && !vendor_name?.trim()) {
    res.status(400);
    throw new Error("vendor_name is required when is_delegated is true");
  }

  // Enforce one pathway per audience + plan + topic combination
  const exists = await ContactPathway.findOne({
    audience_id,
    plan_id,
    topic_id,
  }).lean();
  if (exists) {
    res.status(400);
    throw new Error(
      "A pathway for this audience, plan, and topic combination already exists",
    );
  }

  const pathway = new ContactPathway({
    audience_id,
    plan_id,
    topic_id,
    department,
    phone,
    ivr_steps,
    portal_url,
    email,
    fax,
    notes,
    is_delegated: is_delegated ?? false,
    vendor_name,
    status: "draft",
    created_by: req.user._id,
    updated_by: req.user._id,
  });
  pathway._changedBy = req.user._id;
  await pathway.save();

  res.status(201).json(pathway);
});

// ─── GET ALL PATHWAYS ─────────────────────────────────────────────────────────
// @desc    List all pathways
// @route   GET /api/v1/pathways
// @access  Private
export const getPathways = asyncHandler(async (req, res) => {
  const { status, audience_id, plan_id, topic_id } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (audience_id) filter.audience_id = audience_id;
  if (plan_id) filter.plan_id = plan_id;
  if (topic_id) filter.topic_id = topic_id;

  const pathways = await ContactPathway.find(filter)
    .populate("audience_id", "name slug")
    .populate("plan_id", "name slug")
    .populate("topic_id", "name slug")
    .sort({ createdAt: -1 });

  res.status(200).json(pathways);
});

// ─── GET PATHWAY BY ID ────────────────────────────────────────────────────────
// @desc    Get a single pathway by ID
// @route   GET /api/v1/pathways/:id
// @access  Private
export const getPathwayById = asyncHandler(async (req, res) => {
  const pathway = await ContactPathway.findById(req.params.id)
    .populate("audience_id", "name slug")
    .populate("plan_id", "name slug")
    .populate("topic_id", "name slug");

  if (!pathway) {
    res.status(404);
    throw new Error("Pathway not found");
  }

  res.status(200).json(pathway);
});

// ─── UPDATE PATHWAY ───────────────────────────────────────────────────────────
// @desc    Update a pathway's content fields (status managed via publish/unpublish)
// @route   PUT /api/v1/pathways/:id
// @access  Admin, Super User
export const updatePathway = asyncHandler(async (req, res) => {
  const pathway = await ContactPathway.findById(req.params.id);

  if (!pathway) {
    res.status(404);
    throw new Error("Pathway not found");
  }

  const {
    audience_id,
    plan_id,
    topic_id,
    department,
    phone,
    ivr_steps,
    portal_url,
    email,
    fax,
    notes,
    is_delegated,
    vendor_name,
  } = req.body;

  // If any routing key is changing, check compound uniqueness
  if (
    audience_id !== undefined ||
    plan_id !== undefined ||
    topic_id !== undefined
  ) {
    const newAudienceId = audience_id ?? pathway.audience_id;
    const newPlanId = plan_id ?? pathway.plan_id;
    const newTopicId = topic_id ?? pathway.topic_id;

    const duplicate = await ContactPathway.findOne({
      audience_id: newAudienceId,
      plan_id: newPlanId,
      topic_id: newTopicId,
      _id: { $ne: pathway._id },
    }).lean();
    if (duplicate) {
      res.status(400);
      throw new Error(
        "A pathway for this audience, plan, and topic combination already exists",
      );
    }
  }

  // is_delegated requires vendor_name (check resolved values)
  const resolvedIsDelegated =
    is_delegated !== undefined ? is_delegated : pathway.is_delegated;
  const resolvedVendorName =
    vendor_name !== undefined ? vendor_name : pathway.vendor_name;
  if (resolvedIsDelegated && !resolvedVendorName?.trim()) {
    res.status(400);
    throw new Error("vendor_name is required when is_delegated is true");
  }

  if (audience_id !== undefined) pathway.audience_id = audience_id;
  if (plan_id !== undefined) pathway.plan_id = plan_id;
  if (topic_id !== undefined) pathway.topic_id = topic_id;
  if (department !== undefined) pathway.department = department;
  if (phone !== undefined) pathway.phone = phone;
  if (ivr_steps !== undefined) pathway.ivr_steps = ivr_steps;
  if (portal_url !== undefined) pathway.portal_url = portal_url;
  if (email !== undefined) pathway.email = email;
  if (fax !== undefined) pathway.fax = fax;
  if (notes !== undefined) pathway.notes = notes;
  if (is_delegated !== undefined) pathway.is_delegated = is_delegated;
  if (vendor_name !== undefined) pathway.vendor_name = vendor_name;
  pathway.updated_by = req.user._id;

  pathway._changedBy = req.user._id;
  await pathway.save();

  res.status(200).json(pathway);
});

// ─── PUBLISH PATHWAY ──────────────────────────────────────────────────────────
// @desc    Set pathway status to published
// @route   PUT /api/v1/pathways/:id/publish
// @access  Admin, Super User
export const publishPathway = asyncHandler(async (req, res) => {
  const pathway = await ContactPathway.findById(req.params.id);

  if (!pathway) {
    res.status(404);
    throw new Error("Pathway not found");
  }

  pathway.status = "published";
  pathway.published_at = new Date();
  pathway.updated_by = req.user._id;

  pathway._changedBy = req.user._id;
  await pathway.save();

  res.status(200).json(pathway);
});

// ─── UNPUBLISH PATHWAY ────────────────────────────────────────────────────────
// @desc    Revert pathway status to draft
// @route   PUT /api/v1/pathways/:id/unpublish
// @access  Admin, Super User
export const unpublishPathway = asyncHandler(async (req, res) => {
  const pathway = await ContactPathway.findById(req.params.id);

  if (!pathway) {
    res.status(404);
    throw new Error("Pathway not found");
  }

  pathway.status = "draft";
  pathway.published_at = null;
  pathway.updated_by = req.user._id;

  pathway._changedBy = req.user._id;
  await pathway.save();

  res.status(200).json(pathway);
});

// ─── DELETE PATHWAY ───────────────────────────────────────────────────────────
// @desc    Delete a pathway
// @route   DELETE /api/v1/pathways/:id
// @access  Admin, Super User
export const deletePathway = asyncHandler(async (req, res) => {
  const pathway = await ContactPathway.findByIdAndDelete(req.params.id, {
    _changedBy: req.user._id,
  });

  if (!pathway) {
    res.status(404);
    throw new Error("Pathway not found");
  }

  res.status(200).json({ message: "Pathway deleted" });
});
