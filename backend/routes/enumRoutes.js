import express from "express";
import {
  getCountyCodes,
  getStateAbbreviations,
} from "../controllers/enumControllers.js";

const router = express.Router();

router.route("/county").get(getCountyCodes);
router.route("/state-abbreviations").get(getStateAbbreviations);

export default router;
