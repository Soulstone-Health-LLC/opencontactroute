import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  createTopic,
  getTopics,
  getTopicById,
  updateTopic,
  deleteTopic,
} from "../controllers/topicControllers.js";

const router = express.Router();

router
  .route("/")
  .post(protect, requireRole("admin", "super user"), createTopic)
  .get(protect, getTopics);

router
  .route("/:id")
  .get(protect, getTopicById)
  .put(protect, requireRole("admin", "super user"), updateTopic)
  .delete(protect, requireRole("admin", "super user"), deleteTopic);

export default router;
