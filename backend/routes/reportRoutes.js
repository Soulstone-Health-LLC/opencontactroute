import express from "express";
import {
  getAuditLog,
  getPathwayViews,
  getTopPathways,
  getTopTopics,
  getTopAudiences,
  getTopPlans,
  getPathwayCoverage,
  getContentAudit,
} from "../controllers/reportControllers.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// ─── UTILIZATION REPORTS (any authenticated user) ─────────────────────────────
router.get("/pathway-views", protect, getPathwayViews);
router.get("/top-pathways", protect, getTopPathways);
router.get("/top-topics", protect, getTopTopics);
router.get("/top-audiences", protect, getTopAudiences);
router.get("/top-plans", protect, getTopPlans);

// ─── CONTENT REPORTS (any authenticated user) ────────────────────────────────
router.get("/pathway-coverage", protect, getPathwayCoverage);
router.get("/content-audit", protect, getContentAudit);

// ─── AUDIT LOG (Admin only) ───────────────────────────────────────────────────
router.get("/audit-log", protect, requireRole("admin"), getAuditLog);

export default router;
