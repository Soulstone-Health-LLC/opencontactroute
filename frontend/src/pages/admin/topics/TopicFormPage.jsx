import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getTopic,
  createTopic,
  updateTopic,
} from "../../../services/topicService";

export default function TopicFormPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    is_active: true,
    sort_order: "0",
  });
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    getTopic(id)
      .then((res) => {
        const { name, description, is_active, sort_order } = res.data;
        setForm({
          name: name ?? "",
          description: description ?? "",
          is_active: is_active ?? true,
          sort_order: String(sort_order ?? 0),
        });
      })
      .catch(() => setLoadError("Failed to load topic."))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  function validate() {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required.";
    const sortNum = parseInt(form.sort_order, 10);
    if (form.sort_order === "" || Number.isNaN(sortNum) || sortNum < 0)
      errors.sort_order = "Sort order must be 0 or greater.";
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    const payload = { ...form, sort_order: parseInt(form.sort_order, 10) };
    try {
      if (isEditing) {
        await updateTopic(id, payload);
        toast.success("Topic saved.");
      } else {
        await createTopic(payload);
        toast.success("Topic created.");
      }
      navigate("/admin/topics");
    } catch (err) {
      setSaveError(err.response?.data?.message ?? "Failed to save topic.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="alert alert-danger" role="alert">
        {loadError}
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">{isEditing ? "Edit Topic" : "New Topic"}</h2>
        <Link to="/admin/topics" className="btn btn-outline-secondary btn-sm">
          Cancel
        </Link>
      </div>

      {saveError && (
        <div className="alert alert-danger" role="alert">
          {saveError}
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ maxWidth: 640 }}>
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="name" className="form-label">
                Name{" "}
                <span aria-hidden="true" className="text-danger">
                  *
                </span>
              </label>
              <input
                id="name"
                type="text"
                className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                aria-required="true"
                aria-invalid={fieldErrors.name ? "true" : undefined}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
                autoComplete="off"
              />
              {fieldErrors.name && (
                <div className="invalid-feedback" id="name-error">
                  {fieldErrors.name}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                className="form-control"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="mb-3">
              <label htmlFor="sort_order" className="form-label">
                Sort Order
              </label>
              <input
                id="sort_order"
                type="number"
                className={`form-control ${fieldErrors.sort_order ? "is-invalid" : ""}`}
                value={form.sort_order}
                min={0}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sort_order: e.target.value }))
                }
                aria-invalid={fieldErrors.sort_order ? "true" : undefined}
                aria-describedby={
                  fieldErrors.sort_order
                    ? "sort-order-error"
                    : "sort-order-hint"
                }
              />
              {fieldErrors.sort_order && (
                <div className="invalid-feedback" id="sort-order-error">
                  {fieldErrors.sort_order}
                </div>
              )}
              <div className="form-text" id="sort-order-hint">
                Controls display order. Lower numbers appear first.
              </div>
            </div>

            <div className="mb-4">
              <div className="form-check">
                <input
                  id="is_active"
                  type="checkbox"
                  className="form-check-input"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  aria-describedby="is-active-hint"
                />
                <label htmlFor="is_active" className="form-check-label">
                  Active
                </label>
                <div className="form-text" id="is-active-hint">
                  Inactive topics are hidden from the widget.
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting
                  ? "Saving…"
                  : isEditing
                    ? "Save Changes"
                    : "Create Topic"}
              </button>
              <Link to="/admin/topics" className="btn btn-outline-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
