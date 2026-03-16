import asyncHandler from "express-async-handler";
import Person from "../models/personModel.js";
import User from "../models/userModel.js";

// ─── CREATE PERSON ──────────────────────────────────────────────────────────────
// @desc    Create a new person
// @route   POST /api/v1/persons
// @access  Private
export const createPerson = asyncHandler(async (req, res) => {
  const { user_id, first_name, middle_name, last_name, suffix, is_active } =
    req.body;

  // Verify the user exists
  const userExists = await User.findById(user_id);
  if (!userExists) {
    res.status(404);
    throw new Error("User not found");
  }

  // Check if person already exists for this user_id
  const personExists = await Person.findOne({ user_id });
  if (personExists) {
    res.status(400);
    throw new Error("Person record already exists for this user");
  }

  // Create new person
  const person = new Person({
    user_id,
    first_name,
    middle_name,
    last_name,
    suffix,
    is_active: is_active !== undefined ? is_active : true,
  });
  person._changedBy = req.user._id;
  await person.save();

  res.status(201).json(person);
});

// ─── GET ALL PERSONS ─────────────────────────────────────────────────────────
// @desc    Get all persons
// @route   GET /api/v1/persons
// @access  Private
export const getPersons = asyncHandler(async (req, res) => {
  const { is_active, search } = req.query;

  // Build filter object
  const filter = {};

  if (is_active !== undefined) {
    filter.is_active = is_active === "true";
  }

  // Text search on name fields
  if (search) {
    filter.$or = [
      { first_name: { $regex: search, $options: "i" } },
      { last_name: { $regex: search, $options: "i" } },
      { middle_name: { $regex: search, $options: "i" } },
    ];
  }

  const persons = await Person.find(filter)
    .populate("user_id", "email user_role is_active")
    .sort({ last_name: 1, first_name: 1 });

  res.status(200).json(persons);
});

// ─── GET PERSON BY ID ────────────────────────────────────────────────────────
// @desc    Get person by ID
// @route   GET /api/v1/persons/:id
// @access  Private
export const getPersonById = asyncHandler(async (req, res) => {
  const person = await Person.findById(req.params.id).populate(
    "user_id",
    "email user_role is_active",
  );

  if (person) {
    res.status(200).json(person);
  } else {
    res.status(404);
    throw new Error("Person not found");
  }
});

// ─── GET PERSON BY USER ID ───────────────────────────────────────────────────
// @desc    Get person by user_id
// @route   GET /api/v1/persons/user/:userId
// @access  Private
export const getPersonByUserId = asyncHandler(async (req, res) => {
  const person = await Person.findOne({ user_id: req.params.userId }).populate(
    "user_id",
    "email user_role is_active",
  );

  if (person) {
    res.status(200).json(person);
  } else {
    res.status(404);
    throw new Error("Person not found for this user");
  }
});

// ─── UPDATE PERSON ────────────────────────────────────────────────────────────
// @desc    Update person
// @route   PUT /api/v1/persons/:id
// @access  Private
export const updatePerson = asyncHandler(async (req, res) => {
  const person = await Person.findById(req.params.id);

  if (!person) {
    res.status(404);
    throw new Error("Person not found");
  }

  // Update person fields
  const updatedPerson = await Person.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      returnDocument: "after",
      runValidators: true,
      _changedBy: req.user._id,
    },
  ).populate("user_id", "email user_role is_active");

  res.status(200).json(updatedPerson);
});

// ─── GET PERSON PROFILE ─────────────────────────────────────────────────────
// @desc    Get person profile for authenticated user
// @route   GET /api/v1/persons/profile
// @access  Private
export const getPersonProfile = asyncHandler(async (req, res) => {
  // req.user is populated by authentication middleware
  const person = await Person.findOne({ user_id: req.user._id }).populate(
    "user_id",
    "email user_role is_active",
  );

  if (person) {
    res.status(200).json(person);
  } else {
    res.status(404);
    throw new Error("Person profile not found");
  }
});

// ─── UPDATE PERSON PROFILE ──────────────────────────────────────────────────
// @desc    Update person profile for authenticated user
// @route   PUT /api/v1/persons/profile
// @access  Private
export const updatePersonProfile = asyncHandler(async (req, res) => {
  const person = await Person.findOne({ user_id: req.user._id });

  if (!person) {
    res.status(404);
    throw new Error("Person profile not found");
  }

  // Prevent updating user_id through profile update
  if (req.body.user_id) {
    delete req.body.user_id;
  }

  // Update person profile
  const updatedPerson = await Person.findByIdAndUpdate(person._id, req.body, {
    returnDocument: "after",
    runValidators: true,
    _changedBy: req.user._id,
  }).populate("user_id", "email user_role is_active");

  res.status(200).json(updatedPerson);
});
