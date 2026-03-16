import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ─── AUTHENTICATION ──────────────────────────────────────────────────────
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password_hash: {
      type: String,
      required: [true, "Password is required"],
    },

    // ─── STATUS ──────────────────────────────────────────────────────────────
    is_active: {
      type: Boolean,
      default: true,
    },

    // ─── ROLE ────────────────────────────────────────────────────────────────
    user_role: {
      type: String,
      enum: {
        values: ["user", "super user", "admin"],
        message:
          "{VALUE} is not supported; only user, super user, or admin are allowed.",
      },
      default: "user",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("User", userSchema);
