import asyncHandler from "express-async-handler";
import Topic from "../models/topicModel.js";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function uniqueSlug(base, excludeId = null) {
  let candidate = base;
  let counter = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const filter = { slug: candidate };
    if (excludeId) filter._id = { $ne: excludeId };
    const exists = await Topic.findOne(filter).lean();
    if (!exists) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

// ─── CREATE TOPIC ─────────────────────────────────────────────────────────────
// @desc    Create a new topic
// @route   POST /api/v1/topics
// @access  Admin, Super User
export const createTopic = asyncHandler(async (req, res) => {
  const { name, description, is_active, sort_order } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("Name is required");
  }

  const nameExists = await Topic.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  }).lean();
  if (nameExists) {
    res.status(400);
    throw new Error("A topic with that name already exists");
  }

  const slug = await uniqueSlug(generateSlug(name));

  const topic = new Topic({
    name,
    slug,
    description,
    is_active: is_active !== undefined ? is_active : true,
    sort_order: sort_order !== undefined ? sort_order : 0,
    created_by: req.user._id,
    updated_by: req.user._id,
  });
  topic._changedBy = req.user._id;
  await topic.save();

  res.status(201).json(topic);
});

// ─── GET ALL TOPICS ───────────────────────────────────────────────────────────
// @desc    List all topics
// @route   GET /api/v1/topics
// @access  Private
export const getTopics = asyncHandler(async (req, res) => {
  const { is_active } = req.query;

  const filter = {};
  if (is_active !== undefined) {
    filter.is_active = is_active === "true";
  }

  const topics = await Topic.find(filter).sort({ sort_order: 1, name: 1 });

  res.status(200).json(topics);
});

// ─── GET TOPIC BY ID ──────────────────────────────────────────────────────────
// @desc    Get a single topic by ID
// @route   GET /api/v1/topics/:id
// @access  Private
export const getTopicById = asyncHandler(async (req, res) => {
  const topic = await Topic.findById(req.params.id);

  if (!topic) {
    res.status(404);
    throw new Error("Topic not found");
  }

  res.status(200).json(topic);
});

// ─── UPDATE TOPIC ─────────────────────────────────────────────────────────────
// @desc    Update a topic
// @route   PUT /api/v1/topics/:id
// @access  Admin, Super User
export const updateTopic = asyncHandler(async (req, res) => {
  const topic = await Topic.findById(req.params.id);

  if (!topic) {
    res.status(404);
    throw new Error("Topic not found");
  }

  const { name, description, is_active, sort_order } = req.body;

  if (name !== undefined && name !== topic.name) {
    const nameExists = await Topic.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      _id: { $ne: topic._id },
    }).lean();
    if (nameExists) {
      res.status(400);
      throw new Error("A topic with that name already exists");
    }
    topic.slug = await uniqueSlug(generateSlug(name), topic._id);
    topic.name = name;
  }

  if (description !== undefined) topic.description = description;
  if (is_active !== undefined) topic.is_active = is_active;
  if (sort_order !== undefined) topic.sort_order = sort_order;
  topic.updated_by = req.user._id;

  topic._changedBy = req.user._id;
  await topic.save();

  res.status(200).json(topic);
});

// ─── DELETE TOPIC ─────────────────────────────────────────────────────────────
// @desc    Delete a topic
// @route   DELETE /api/v1/topics/:id
// @access  Admin, Super User
export const deleteTopic = asyncHandler(async (req, res) => {
  const topic = await Topic.findByIdAndDelete(req.params.id, {
    _changedBy: req.user._id,
  });

  if (!topic) {
    res.status(404);
    throw new Error("Topic not found");
  }

  res.status(200).json({ message: "Topic deleted" });
});
