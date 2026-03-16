import express from "express";
import {
  registerUser,
  authUser,
  userProfile,
} from "../controllers/userControllers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────
router.post("/auth", authUser);
router.post("/register", registerUser);

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────
router.get("/profile", protect, userProfile);

export default router;
