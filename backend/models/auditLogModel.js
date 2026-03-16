import mongoose from "mongoose";

const { Schema } = mongoose;

// ─── CHANGE SUBDOCUMENT ──────────────────────────────────────────────────────
const changeSchema = new Schema(
  {
    field: {
      type: String,
      required: true,
    },
    old_value: {
      type: Schema.Types.Mixed,
      default: null,
    },
    new_value: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false },
);

// ─── AUDIT LOG SCHEMA ─────────────────────────────────────────────────────────
const auditLogSchema = new Schema(
  {
    resource: {
      type: String,
      required: [true, "Resource name is required"],
    },
    resource_id: {
      type: Schema.Types.ObjectId,
      required: [true, "Resource ID is required"],
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      enum: {
        values: ["create", "update", "delete"],
        message: "{VALUE} is not a valid action",
      },
    },
    changed_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changed_at: {
      type: Date,
      default: Date.now,
    },
    changes: [changeSchema],
  },
  {
    // Append-only — no updatedAt needed
    timestamps: false,
  },
);

// ─── INDEXES ─────────────────────────────────────────────────────────────────
auditLogSchema.index({ resource: 1, resource_id: 1 });
auditLogSchema.index({ changed_by: 1 });
auditLogSchema.index({ changed_at: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
