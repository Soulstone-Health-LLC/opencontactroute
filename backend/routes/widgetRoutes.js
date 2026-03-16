import express from "express";
import {
  getWidgetAudiences,
  getWidgetPlans,
  getWidgetTopics,
  getWidgetPathway,
  recordWidgetEvent,
} from "../controllers/widgetControllers.js";

const router = express.Router();

// All widget routes are public — no protect middleware

router.get("/audiences", getWidgetAudiences);
router.get("/plans", getWidgetPlans);
router.get("/topics", getWidgetTopics);
router.get("/pathway", getWidgetPathway);
router.post("/event", recordWidgetEvent);

export default router;
