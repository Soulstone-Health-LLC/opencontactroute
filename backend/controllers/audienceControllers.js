import asyncHandler from "express-async-handler";
import Audience from "../models/audienceModel.js";

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
    const exists = await Audience.findOne(filter).lean();
    if (!exists) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

// ─── CREATE AUDIENCE ──────────────────────────────────────────────────────────
// @desc    Create a new audience
// @route   POST /api/v1/audiences
// @access  Admin, Super User
export const createAudience = asyncHandler(async (req, res) => {
  const { name, description, is_active, sort_order } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("Name is required");
  }

  const nameExists = await Audience.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  }).lean();
  if (nameExists) {
    res.status(400);
    throw new Error("An audience with that name already exists");
  }

  const slug = await uniqueSlug(generateSlug(name));

  const audience = new Audience({
    name,
    slug,
    description,
    is_active: is_active !== undefined ? is_active : true,
    sort_order: sort_order !== undefined ? sort_order : 0,
    created_by: req.user._id,
    updated_by: req.user._id,
  });
  audience._changedBy = req.user._id;
  await audience.save();

  res.status(201).json(audience);
});

// ─── GET ALL AUDIENCES ────────────────────────────────────────────────────────
// @desc    List all audiences
// @route   GET /api/v1/audiences
// @access  Private
export const getAudiences = asyncHandler(async (req, res) => {
  const { is_active } = req.query;

  const filter = {};
  if (is_active !== undefined) {
    filter.is_active = is_active === "true";
  }

  const audiences = await Audience.find(filter).sort({
    sort_order: 1,
    name: 1,
  });

  res.status(200).json(audiences);
});

// ─── GET AUDIENCE BY ID ───────────────────────────────────────────────────────
// @desc    Get a single audience by ID
// @route   GET /api/v1/audiences/:id
// @access  Private
export const getAudienceById = asyncHandler(async (req, res) => {
  const audience = await Audience.findById(req.params.id);

  if (!audience) {
    res.status(404);
    throw new Error("Audience not found");
  }

  res.status(200).json(audience);
});

// ─── UPDATE AUDIENCE ──────────────────────────────────────────────────────────
// @desc    Update an audience
// @route   PUT /api/v1/audiences/:id
// @access  Admin, Super User
export const updateAudience = asyncHandler(async (req, res) => {
  const audience = await Audience.findById(req.params.id);

  if (!audience) {
    res.status(404);
    throw new Error("Audience not found");
  }

  const { name, description, is_active, sort_order } = req.body;

  // If name is changing, check for duplicates and regenerate slug
  if (name !== undefined && name !== audience.name) {
    const nameExists = await Audience.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      _id: { $ne: audience._id },
    }).lean();
    if (nameExists) {
      res.status(400);
      throw new Error("An audience with that name already exists");
    }
    audience.slug = await uniqueSlug(generateSlug(name), audience._id);
    audience.name = name;
  }

  if (description !== undefined) audience.description = description;
  if (is_active !== undefined) audience.is_active = is_active;
  if (sort_order !== undefined) audience.sort_order = sort_order;
  audience.updated_by = req.user._id;

  audience._changedBy = req.user._id;
  await audience.save();

  res.status(200).json(audience);
});

// ─── DELETE AUDIENCE ──────────────────────────────────────────────────────────
// @desc    Delete an audience
// @route   DELETE /api/v1/audiences/:id
// @access  Admin, Super User
export const deleteAudience = asyncHandler(async (req, res) => {
  const audience = await Audience.findByIdAndDelete(req.params.id, {
    _changedBy: req.user._id,
  });

  if (!audience) {
    res.status(404);
    throw new Error("Audience not found");
  }

  res.status(200).json({ message: "Audience deleted" });
});
