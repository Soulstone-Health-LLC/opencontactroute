import mongoose from "mongoose";
import { auditLogPlugin } from "../utils/auditLogPlugin.js";

const { Schema } = mongoose;

const personSchema = new Schema(
  {
    // ─── USER LINK ───────────────────────────────────────────────────────────
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },

    // ─── NAME INFORMATION ─────────────────────────────────────────────────────
    first_name: {
      type: String,
      required: [true, "First name is required"],
    },
    middle_name: {
      type: String,
    },
    last_name: {
      type: String,
      required: [true, "Last name is required"],
    },
    suffix: {
      type: String,
      enum: {
        values: ["Jr.", "Sr.", "II", "III", "IV", "V", "MD", "PhD", "Esq."],
        message: "Invalid suffix value",
      },
    },

    // ─── STATUS ──────────────────────────────────────────────────────────────
    is_active: {
      type: Boolean,
      default: true,
    },

    // ─── OWNERSHIP ───────────────────────────────────────────────────────────
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

// ─── INDEXES ─────────────────────────────────────────────────────────────────
// Note: user_id index is created automatically via `unique: true` in the schema
personSchema.index({ last_name: 1, first_name: 1 });

// ─── VIRTUALS ────────────────────────────────────────────────────────────────

// Virtual for full name
personSchema.virtual("full_name").get(function () {
  let fullName = `${this.first_name}`;
  if (this.middle_name) {
    fullName += ` ${this.middle_name}`;
  }
  fullName += ` ${this.last_name}`;
  if (this.suffix) {
    fullName += `, ${this.suffix}`;
  }
  return fullName;
});

// Virtual for display name (shorter version)
personSchema.virtual("display_name").get(function () {
  let displayName = `${this.first_name} ${this.last_name}`;
  return displayName;
});

// Ensure virtuals are included in JSON output
personSchema.set("toJSON", { virtuals: true });
personSchema.set("toObject", { virtuals: true });

// ─── PLUGINS ──────────────────────────────────────────────────────────────────
personSchema.plugin(auditLogPlugin);

export default mongoose.model("Person", personSchema);
