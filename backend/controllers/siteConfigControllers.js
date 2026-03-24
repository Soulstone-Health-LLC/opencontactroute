import asyncHandler from "express-async-handler";
import SiteConfig from "../models/siteConfigModel.js";

const DEFAULTS = {
  org_name: "",
  primary_color: "#0d6efd",
};

// ─── GET SITE CONFIG ──────────────────────────────────────────────────────────
// @desc    Get site configuration (branding, instance name)
// @route   GET /api/v1/settings
// @access  Public
export const getSiteConfig = asyncHandler(async (_req, res) => {
  const config = await SiteConfig.findOne().lean();
  res.json(config || DEFAULTS);
});

// ─── UPDATE SITE CONFIG ───────────────────────────────────────────────────────
// @desc    Update site configuration
// @route   PUT /api/v1/settings
// @access  Admin
export const updateSiteConfig = asyncHandler(async (req, res) => {
  const { org_name, primary_color } = req.body;

  const update = { updated_by: req.user._id };
  if (org_name !== undefined) update.org_name = org_name.trim();
  if (primary_color !== undefined) update.primary_color = primary_color.trim();

  const config = await SiteConfig.findOneAndUpdate({}, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true,
    _changedBy: req.user._id,
  });

  res.json(config);
});
