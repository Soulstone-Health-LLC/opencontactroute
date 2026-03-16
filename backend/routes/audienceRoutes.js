import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  createAudience,
  getAudiences,
  getAudienceById,
  updateAudience,
  deleteAudience,
} from "../controllers/audienceControllers.js";

const router = express.Router();

router
  .route("/")
  .post(protect, requireRole("admin", "super user"), createAudience)
  .get(protect, getAudiences);

router
  .route("/:id")
  .get(protect, getAudienceById)
  .put(protect, requireRole("admin", "super user"), updateAudience)
  .delete(protect, requireRole("admin", "super user"), deleteAudience);

export default router;
