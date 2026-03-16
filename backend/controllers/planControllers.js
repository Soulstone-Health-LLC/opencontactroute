import asyncHandler from "express-async-handler";
import Plan from "../models/planModel.js";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Ensures the slug is unique; appends -2, -3, … if needed.
async function uniqueSlug(base, excludeId = null) {
  let candidate = base;
  let counter = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const filter = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Plan.findOne(filter).lean();
    if (!exists) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

// ─── CREATE PLAN ──────────────────────────────────────────────────────────────
// @desc    Create a new plan
// @route   POST /api/v1/plans
// @access  Admin, Super User
export const createPlan = asyncHandler(async (req, res) => {
  const { name, description, is_active, sort_order } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("Name is required");
  }

  const nameExists = await Plan.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  }).lean();
  if (nameExists) {
    res.status(400);
    throw new Error("A plan with that name already exists");
  }

  const slug = await uniqueSlug(generateSlug(name));

  const plan = new Plan({
    name,
    slug,
    description,
    is_active: is_active !== undefined ? is_active : true,
    sort_order: sort_order !== undefined ? sort_order : 0,
    created_by: req.user._id,
    updated_by: req.user._id,
  });
  plan._changedBy = req.user._id;
  await plan.save();

  res.status(201).json(plan);
});

// ─── GET ALL PLANS ────────────────────────────────────────────────────────────
// @desc    List all plans
// @route   GET /api/v1/plans
// @access  Private
export const getPlans = asyncHandler(async (req, res) => {
  const { is_active } = req.query;

  const filter = {};
  if (is_active !== undefined) {
    filter.is_active = is_active === "true";
  }

  const plans = await Plan.find(filter).sort({ sort_order: 1, name: 1 });

  res.status(200).json(plans);
});

// ─── GET PLAN BY ID ───────────────────────────────────────────────────────────
// @desc    Get a single plan by ID
// @route   GET /api/v1/plans/:id
// @access  Private
export const getPlanById = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);

  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  res.status(200).json(plan);
});

// ─── UPDATE PLAN ──────────────────────────────────────────────────────────────
// @desc    Update a plan
// @route   PUT /api/v1/plans/:id
// @access  Admin, Super User
export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);

  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  const { name, description, is_active, sort_order } = req.body;

  if (name !== undefined && name !== plan.name) {
    const nameExists = await Plan.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      _id: { $ne: plan._id },
    }).lean();
    if (nameExists) {
      res.status(400);
      throw new Error("A plan with that name already exists");
    }
    plan.slug = await uniqueSlug(generateSlug(name), plan._id);
    plan.name = name;
  }

  if (description !== undefined) plan.description = description;
  if (is_active !== undefined) plan.is_active = is_active;
  if (sort_order !== undefined) plan.sort_order = sort_order;
  plan.updated_by = req.user._id;

  plan._changedBy = req.user._id;
  await plan.save();

  res.status(200).json(plan);
});

// ─── DELETE PLAN ──────────────────────────────────────────────────────────────
// @desc    Delete a plan
// @route   DELETE /api/v1/plans/:id
// @access  Admin, Super User
export const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndDelete(req.params.id, {
    _changedBy: req.user._id,
  });

  if (!plan) {
    res.status(404);
    throw new Error("Plan not found");
  }

  res.status(200).json({ message: "Plan deleted" });
});
