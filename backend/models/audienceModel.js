import mongoose from "mongoose";
import { auditLogPlugin } from "../utils/auditLogPlugin.js";

const { Schema } = mongoose;

// ─── AUDIENCE SCHEMA ──────────────────────────────────────────────────────────
const audienceSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

// ─── INDEXES ──────────────────────────────────────────────────────────────────
audienceSchema.index({ sort_order: 1 });
audienceSchema.index({ is_active: 1 });

// ─── AUDIT LOG PLUGIN ─────────────────────────────────────────────────────────
audienceSchema.plugin(auditLogPlugin);

export default mongoose.model("Audience", audienceSchema);
