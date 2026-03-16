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

const router = express.Router();

// ─── PROFILE ROUTES ──────────────────────────────────────────────────────────
router
  .route("/profile")
  .get(protect, getPersonProfile)
  .put(protect, updatePersonProfile);

// ─── USER LOOKUP ────────────────────────────────────────────────────────────
router.route("/user/:userId").get(protect, getPersonByUserId);

// ─── STANDARD CRUD ROUTES ─────────────────────────────────────────────────
router.route("/").post(protect, createPerson).get(protect, getPersons);

router.route("/:id").get(protect, getPersonById).put(protect, updatePerson);

export default router;
