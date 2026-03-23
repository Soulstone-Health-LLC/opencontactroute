import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  createPathway,
  getPathways,
  getPathwayById,
  updatePathway,
  publishPathway,
  unpublishPathway,
  deletePathway,
} from "../controllers/contactPathwayControllers.js";

const router = express.Router();

router
  .route("/")
  .post(protect, requireRole("admin", "super user"), createPathway)
  .get(protect, getPathways);

// /:id/publish and /:id/unpublish must be declared before /:id to prevent
// Express matching "publish" as the :id parameter.
router
  .route("/:id/publish")
  .put(protect, requireRole("admin", "super user"), publishPathway);

router
  .route("/:id/unpublish")
  .put(protect, requireRole("admin", "super user"), unpublishPathway);

router
  .route("/:id")
  .get(protect, getPathwayById)
  .put(protect, requireRole("admin", "super user"), updatePathway)
  .delete(protect, requireRole("admin", "super user"), deletePathway);

export default router;
