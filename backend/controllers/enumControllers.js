import asyncHandler from "express-async-handler";

import countyCodes from "../utils/enumValues/countyCodes.js";
import stateAbbreviations from "../utils/enumValues/stateEnums.js";

// @desc    Get all county codes
// @route   GET /api/v1/enums/county
// @access  Public
export const getCountyCodes = asyncHandler(async (req, res) => {
  if (countyCodes) {
    res.status(200).json(countyCodes);
  } else {
    res.status(404);
    throw new Error("No county codes found");
  }
});

// @desc    Get all state abbreviations
// @route   GET /api/v1/enums/state-abbreviations
// @access  Public
export const getStateAbbreviations = asyncHandler(async (req, res) => {
  if (stateAbbreviations) {
    res.status(200).json(stateAbbreviations);
  } else {
    res.status(404);
    throw new Error("No state abbreviations found");
  }
});
