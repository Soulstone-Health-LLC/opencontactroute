import express from "express";
import { getAuditLog } from "../controllers/reportControllers.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";

const router = express.Router();

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
router.get("/audit-log", protect, requireRole("admin"), getAuditLog);

export default router;
