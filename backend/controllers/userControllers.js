import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";

const BCRYPT_ROUNDS = 10;

// ─── REGISTER USER ────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/v1/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { email, password, is_active, user_role } = req.body;

  // Check if password input is present
  if (!password) {
    res.status(400);
    throw new Error("Password is required");
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  // Hash the password with a unique salt per user
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create new user
  const user = await User.create({
    email,
    password_hash: hashedPassword,
    is_active: is_active !== undefined ? is_active : true,
    user_role: user_role || "user",
  });

  if (user) {
    generateToken(res, user._id);

    res.status(201).json({
      _id: user._id,
      email: user.email,
      is_active: user.is_active,
      user_role: user.user_role,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// ─── AUTHENTICATE USER ─────────────────────────────────────────────────────
// @desc    Auth user & get token
// @route   POST /api/v1/users/auth
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (
    user &&
    user.is_active === true &&
    (await bcrypt.compare(password, user.password_hash))
  ) {
    generateToken(res, user._id);
    res.json({
      _id: user._id,
      email: user.email,
      is_active: user.is_active,
      user_role: user.user_role,
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// ─── GET USER PROFILE ───────────────────────────────────────────────────────
// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
const userProfile = asyncHandler(async (req, res) => {
  // req.user is already populated by passport-jwt (without password_hash)
  res.json(req.user);
});

export { registerUser, authUser, userProfile };
