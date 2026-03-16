import express from "express";
import {
  createPerson,
  getPersons,
  getPersonById,
  getPersonByUserId,
  updatePerson,
  getPersonProfile,
  updatePersonProfile,
} from "../controllers/personControllers.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// ─── PROFILE ROUTES (any authenticated user) ─────────────────────────────────
router
  .route("/profile")
  .get(protect, getPersonProfile)
  .put(protect, updatePersonProfile);

// ─── USER LOOKUP (any authenticated user) ────────────────────────────────────
router.route("/user/:userId").get(protect, getPersonByUserId);

// ─── STANDARD CRUD ROUTES ────────────────────────────────────────────────────
router
  .route("/")
  .post(protect, createPerson)
  .get(protect, requireRole("admin", "super user"), getPersons);

router
  .route("/:id")
  .get(protect, requireRole("admin", "super user"), getPersonById)
  .put(protect, requireRole("admin"), updatePerson);

export default router;
