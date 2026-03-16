import express from "express";
import {
  registerUser,
  authUser,
  logoutUser,
  userProfile,
  getUsers,
  getUserById,
  updateUser,
  activateUser,
  deactivateUser,
} from "../controllers/userControllers.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────
router.post("/auth", authUser);
router.post("/register", registerUser);

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────
router.post("/logout", protect, logoutUser);
router.get("/profile", protect, userProfile);

// ─── ADMIN ROUTES — activate/deactivate before /:id to avoid route shadowing ──
router.put("/:id/activate", protect, requireRole("admin"), activateUser);
router.put("/:id/deactivate", protect, requireRole("admin"), deactivateUser);

router.route("/").get(protect, requireRole("admin"), getUsers);

router
  .route("/:id")
  .get(protect, requireRole("admin"), getUserById)
  .put(protect, requireRole("admin"), updateUser);

export default router;
