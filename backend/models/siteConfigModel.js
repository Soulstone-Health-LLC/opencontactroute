import mongoose from "mongoose";
import { auditLogPlugin } from "../utils/auditLogPlugin.js";

const { Schema } = mongoose;

// ─── SITE CONFIG SCHEMA ───────────────────────────────────────────────────────
// Singleton document — one per deployment.  Use findOneAndUpdate with upsert
// rather than creating multiple records.
const siteConfigSchema = new Schema(
  {
    org_name: {
      type: String,
      trim: true,
      default: "",
    },
    primary_color: {
      type: String,
      trim: true,
      default: "#0d6efd",
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

siteConfigSchema.plugin(auditLogPlugin);

const SiteConfig = mongoose.model("SiteConfig", siteConfigSchema);

export default SiteConfig;
