import AuditLog from "../models/auditLogModel.js";
import logger from "./logger.js";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const SKIP_FIELDS = new Set(["__v", "createdAt", "updatedAt"]);
// Fields that are tracked (so the change is visible) but whose values must
// never be stored in plain text.
const REDACT_FIELDS = new Set(["password_hash"]);

function diffObjects(oldObj, newObj) {
  const changes = [];
  if (!oldObj || !newObj) return changes;

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (SKIP_FIELDS.has(key) || key.startsWith("_")) continue;
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      if (REDACT_FIELDS.has(key)) {
        changes.push({
          field: key,
          old_value: "[redacted]",
          new_value: "[redacted]",
        });
      } else {
        changes.push({
          field: key,
          old_value: oldObj[key] ?? null,
          new_value: newObj[key] ?? null,
        });
      }
    }
  }

  return changes;
}

// ─── PLUGIN ───────────────────────────────────────────────────────────────────
// Applies audit logging to a Mongoose schema via pre/post hooks.
//
// Usage:
//   schema.plugin(auditLogPlugin);
//
// Passing changed_by:
//   - Document save:  set `doc._changedBy = req.user._id` before doc.save()
//   - Query methods:  pass `_changedBy: req.user._id` in the options object
//                     e.g. Model.findByIdAndUpdate(id, body, { new: true, _changedBy: req.user._id })
//
export function auditLogPlugin(schema) {
  // ── Transient virtual — not persisted to MongoDB ───────────────────────────
  schema
    .virtual("_changedBy")
    .get(function () {
      return this.__changedBy__;
    })
    .set(function (v) {
      this.__changedBy__ = v;
    });

  // ─────────────────────────────────────────────────────────────────────────
  // DOCUMENT MIDDLEWARE: save (covers Model.create and doc.save)
  // ─────────────────────────────────────────────────────────────────────────

  schema.pre("save", async function () {
    this._auditIsNew = this.isNew;
    if (!this.isNew) {
      try {
        const original = await this.constructor.findById(this._id).lean();
        this._auditOriginalDoc = original;
      } catch {
        this._auditOriginalDoc = null;
      }
    }
  });

  schema.post("save", async function () {
    try {
      const action = this._auditIsNew ? "create" : "update";
      const changes =
        action === "update"
          ? diffObjects(this._auditOriginalDoc, this.toObject())
          : [];

      await AuditLog.create({
        resource: this.constructor.modelName,
        resource_id: this._id,
        action,
        changed_by: this.__changedBy__ ?? null,
        changed_at: new Date(),
        changes,
      });
    } catch (err) {
      logger.error({
        message: "Failed to write audit log on save",
        resource: this.constructor.modelName,
        error: err.message,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY MIDDLEWARE: findOneAndUpdate (covers findByIdAndUpdate)
  // ─────────────────────────────────────────────────────────────────────────

  schema.pre("findOneAndUpdate", async function () {
    try {
      const doc = await this.model.findOne(this.getFilter()).lean();
      this._auditOriginalDoc = doc;
    } catch {
      this._auditOriginalDoc = null;
    }
  });

  schema.post("findOneAndUpdate", async function (doc) {
    if (!doc) return;
    try {
      const current = doc.toObject ? doc.toObject() : doc;
      const changes = diffObjects(this._auditOriginalDoc, current);

      await AuditLog.create({
        resource: this.model.modelName,
        resource_id: doc._id,
        action: "update",
        changed_by: this.options._changedBy ?? null,
        changed_at: new Date(),
        changes,
      });
    } catch (err) {
      logger.error({
        message: "Failed to write audit log on findOneAndUpdate",
        resource: this.model.modelName,
        error: err.message,
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY MIDDLEWARE: findOneAndDelete (covers findByIdAndDelete)
  // ─────────────────────────────────────────────────────────────────────────

  schema.pre("findOneAndDelete", async function () {
    try {
      const doc = await this.model.findOne(this.getFilter()).lean();
      this._auditOriginalDoc = doc;
    } catch {
      this._auditOriginalDoc = null;
    }
  });

  schema.post("findOneAndDelete", async function (doc) {
    const resource_id = doc?._id || this._auditOriginalDoc?._id;
    if (!resource_id) return;
    try {
      await AuditLog.create({
        resource: this.model.modelName,
        resource_id,
        action: "delete",
        changed_by: this.options._changedBy ?? null,
        changed_at: new Date(),
        changes: [],
      });
    } catch (err) {
      logger.error({
        message: "Failed to write audit log on findOneAndDelete",
        resource: this.model.modelName,
        error: err.message,
      });
    }
  });
}
