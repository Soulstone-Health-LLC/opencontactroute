import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
} from "../controllers/planControllers.js";

const router = express.Router();

router
  .route("/")
  .post(protect, requireRole("admin", "super user"), createPlan)
  .get(protect, getPlans);

router
  .route("/:id")
  .get(protect, getPlanById)
  .put(protect, requireRole("admin", "super user"), updatePlan)
  .delete(protect, requireRole("admin", "super user"), deletePlan);

export default router;
