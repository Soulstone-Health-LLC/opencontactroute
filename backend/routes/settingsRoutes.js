import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  getSiteConfig,
  updateSiteConfig,
} from "../controllers/siteConfigControllers.js";

const router = express.Router();

router
  .route("/")
  .get(getSiteConfig) // public — widget and admin can both read branding
  .put(protect, requireRole("admin"), updateSiteConfig);

export default router;
