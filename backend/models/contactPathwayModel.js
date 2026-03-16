import mongoose from "mongoose";
import { auditLogPlugin } from "../utils/auditLogPlugin.js";

const { Schema } = mongoose;

// ─── CONTACT PATHWAY SCHEMA ───────────────────────────────────────────────────
const contactPathwaySchema = new Schema(
  {
    // ─── ROUTING KEYS ─────────────────────────────────────────────────────────
    audience_id: {
      type: Schema.Types.ObjectId,
      ref: "Audience",
      required: [true, "Audience is required"],
    },
    plan_id: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "Plan is required"],
    },
    topic_id: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      required: [true, "Topic is required"],
    },

    // ─── CONTACT DETAILS ──────────────────────────────────────────────────────
    department: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    ivr_steps: {
      type: [String],
      default: [],
    },
    portal_url: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    fax: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },

    // ─── DELEGATION ───────────────────────────────────────────────────────────
    is_delegated: {
      type: Boolean,
      default: false,
    },
    vendor_name: {
      type: String,
      trim: true,
    },

    // ─── PUBLISHING ───────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ["draft", "published"],
        message: "{VALUE} is not a valid status",
      },
      default: "draft",
    },
    published_at: {
      type: Date,
      default: null,
    },

    // ─── OWNERSHIP ────────────────────────────────────────────────────────────
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
// Compound unique index — one pathway per audience + plan + topic combination
contactPathwaySchema.index(
  { audience_id: 1, plan_id: 1, topic_id: 1 },
  { unique: true },
);
contactPathwaySchema.index({ status: 1 });

// ─── AUDIT LOG PLUGIN ─────────────────────────────────────────────────────────
contactPathwaySchema.plugin(auditLogPlugin);

export default mongoose.model("ContactPathway", contactPathwaySchema);
