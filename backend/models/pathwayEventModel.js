import mongoose from "mongoose";

const { Schema } = mongoose;

// ─── PATHWAY EVENT SCHEMA ─────────────────────────────────────────────────────
// Append-only event log. No updates or deletes. No auditLogPlugin.
const pathwayEventSchema = new Schema(
  {
    pathway_id: {
      type: Schema.Types.ObjectId,
      ref: "ContactPathway",
      required: [true, "pathway_id is required"],
    },

    // Denormalized routing keys for query speed (no joins needed in reports)
    audience_id: {
      type: Schema.Types.ObjectId,
      ref: "Audience",
      required: [true, "audience_id is required"],
    },
    plan_id: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
      required: [true, "plan_id is required"],
    },
    topic_id: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      required: [true, "topic_id is required"],
    },

    occurred_at: {
      type: Date,
      default: () => new Date(),
    },

    embed_source: {
      type: String,
      trim: true,
    },
  },
  {
    // Append-only — no updatedAt needed
    timestamps: false,
  },
);

// Indexes for reporting queries
pathwayEventSchema.index({ pathway_id: 1 });
pathwayEventSchema.index({ audience_id: 1 });
pathwayEventSchema.index({ plan_id: 1 });
pathwayEventSchema.index({ topic_id: 1 });
pathwayEventSchema.index({ occurred_at: -1 });

const PathwayEvent = mongoose.model("PathwayEvent", pathwayEventSchema);

export default PathwayEvent;
