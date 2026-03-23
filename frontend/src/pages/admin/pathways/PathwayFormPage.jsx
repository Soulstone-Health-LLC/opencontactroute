import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getPathway,
  createPathway,
  updatePathway,
} from "../../../services/pathwayService";
import { getAudiences } from "../../../services/audienceService";
import { getPlans } from "../../../services/planService";
import { getTopics } from "../../../services/topicService";
import InfoTooltip from "../../../components/ui/InfoTooltip";

export default function PathwayFormPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    audience_id: "",
    plan_id: "",
    topic_id: "",
    department: "",
    phone: "",
    ivr_steps: [],
    portal_url: "",
    email: "",
    fax: "",
    notes: "",
    is_delegated: false,
    vendor_name: "",
  });
  const [audiences, setAudiences] = useState([]);
  const [plans, setPlans] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetches = [
      getAudiences(),
      getPlans(),
      getTopics(),
      isEditing ? getPathway(id) : Promise.resolve(null),
    ];
    Promise.all(fetches)
      .then(([audRes, planRes, topicRes, pwRes]) => {
        setAudiences(audRes.data.filter((a) => a.is_active));
        setPlans(planRes.data.filter((p) => p.is_active));
        setTopics(topicRes.data.filter((t) => t.is_active));
        if (pwRes) {
          const pw = pwRes.data;
          setForm({
            audience_id: pw.audience_id?._id ?? pw.audience_id ?? "",
            plan_id: pw.plan_id?._id ?? pw.plan_id ?? "",
            topic_id: pw.topic_id?._id ?? pw.topic_id ?? "",
            department: pw.department ?? "",
            phone: pw.phone ?? "",
            ivr_steps: pw.ivr_steps ?? [],
            portal_url: pw.portal_url ?? "",
            email: pw.email ?? "",
            fax: pw.fax ?? "",
            notes: pw.notes ?? "",
            is_delegated: pw.is_delegated ?? false,
            vendor_name: pw.vendor_name ?? "",
          });
        }
      })
      .catch(() => setLoadError("Failed to load form data."))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  function validate() {
    const errors = {};
    if (!form.audience_id) errors.audience_id = "Audience is required.";
    if (!form.plan_id) errors.plan_id = "Plan is required.";
    if (!form.topic_id) errors.topic_id = "Topic is required.";
    if (form.is_delegated && !form.vendor_name.trim())
      errors.vendor_name = "Vendor name is required when delegated.";
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
    try {
      if (isEditing) {
        await updatePathway(id, form);
        toast.success("Pathway saved.");
      } else {
        await createPathway(form);
        toast.success("Pathway created.");
      }
      navigate("/admin/pathways");
    } catch (err) {
      setSaveError(err.response?.data?.message ?? "Failed to save pathway.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function addIvrStep() {
    setForm((prev) => ({ ...prev, ivr_steps: [...prev.ivr_steps, ""] }));
  }

  function updateIvrStep(index, value) {
    setForm((prev) => {
      const steps = [...prev.ivr_steps];
      steps[index] = value;
      return { ...prev, ivr_steps: steps };
    });
  }

  function removeIvrStep(index) {
    setForm((prev) => ({
      ...prev,
      ivr_steps: prev.ivr_steps.filter((_, i) => i !== index),
    }));
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
        <h2 className="mb-0">{isEditing ? "Edit Pathway" : "New Pathway"}</h2>
        <Link to="/admin/pathways" className="btn btn-outline-secondary btn-sm">
          Cancel
        </Link>
      </div>

      {saveError && (
        <div className="alert alert-danger" role="alert">
          {saveError}
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ maxWidth: 720 }}>
          <form onSubmit={handleSubmit} noValidate>
            {/* ── ROUTING KEYS ───────────────────────────────────────────── */}
            <h6 className="text-muted mb-3">Routing</h6>

            <div className="mb-3">
              <label htmlFor="audience_id" className="form-label">
                Audience{" "}
                <span aria-hidden="true" className="text-danger">
                  *
                </span>
              </label>
              <select
                id="audience_id"
                className={`form-select ${
                  fieldErrors.audience_id ? "is-invalid" : ""
                }`}
                value={form.audience_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, audience_id: e.target.value }))
                }
                aria-required="true"
                aria-invalid={fieldErrors.audience_id ? "true" : undefined}
                aria-describedby={
                  fieldErrors.audience_id ? "audience-error" : undefined
                }
              >
                <option value="">— Select audience —</option>
                {audiences.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {fieldErrors.audience_id && (
                <div className="invalid-feedback" id="audience-error">
                  {fieldErrors.audience_id}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="plan_id" className="form-label">
                Plan{" "}
                <span aria-hidden="true" className="text-danger">
                  *
                </span>
              </label>
              <select
                id="plan_id"
                className={`form-select ${
                  fieldErrors.plan_id ? "is-invalid" : ""
                }`}
                value={form.plan_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, plan_id: e.target.value }))
                }
                aria-required="true"
                aria-invalid={fieldErrors.plan_id ? "true" : undefined}
                aria-describedby={
                  fieldErrors.plan_id ? "plan-error" : undefined
                }
              >
                <option value="">— Select plan —</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {fieldErrors.plan_id && (
                <div className="invalid-feedback" id="plan-error">
                  {fieldErrors.plan_id}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="topic_id" className="form-label">
                Topic{" "}
                <span aria-hidden="true" className="text-danger">
                  *
                </span>
              </label>
              <select
                id="topic_id"
                className={`form-select ${
                  fieldErrors.topic_id ? "is-invalid" : ""
                }`}
                value={form.topic_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, topic_id: e.target.value }))
                }
                aria-required="true"
                aria-invalid={fieldErrors.topic_id ? "true" : undefined}
                aria-describedby={
                  fieldErrors.topic_id ? "topic-error" : undefined
                }
              >
                <option value="">— Select topic —</option>
                {topics.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {fieldErrors.topic_id && (
                <div className="invalid-feedback" id="topic-error">
                  {fieldErrors.topic_id}
                </div>
              )}
            </div>

            {/* ── CONTACT DETAILS ──────────────────────────────────────── */}
            <hr />
            <h6 className="text-muted mb-3">Contact Details</h6>

            <div className="mb-3">
              <label htmlFor="department" className="form-label">
                Department{" "}
                <InfoTooltip text="The department or team this pathway routes to. Displayed in the widget to help consumers identify the right contact." />
              </label>
              <input
                id="department"
                type="text"
                className="form-control"
                value={form.department}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, department: e.target.value }))
                }
                autoComplete="off"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="phone" className="form-label">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                className="form-control"
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                autoComplete="off"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                IVR Steps{" "}
                <InfoTooltip text="Interactive Voice Response steps. Enter each phone menu prompt a caller should follow in order (e.g. 'Press 1 for Billing'). Displayed in the widget to guide members through the phone system." />
              </label>
              {form.ivr_steps.map((step, i) => (
                <div key={i} className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control"
                    value={step}
                    onChange={(e) => updateIvrStep(i, e.target.value)}
                    aria-label={`IVR step ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => removeIvrStep(i)}
                    aria-label={`Remove IVR step ${i + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={addIvrStep}
              >
                + Add IVR Step
              </button>
            </div>

            <div className="mb-3">
              <label htmlFor="portal_url" className="form-label">
                Portal URL{" "}
                <InfoTooltip text="A link to an online self-service or member portal. Displayed in the widget as an alternative contact option." />
              </label>
              <input
                id="portal_url"
                type="url"
                className="form-control"
                value={form.portal_url}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, portal_url: e.target.value }))
                }
                autoComplete="off"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                autoComplete="off"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="fax" className="form-label">
                Fax
              </label>
              <input
                id="fax"
                type="text"
                className="form-control"
                value={form.fax}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fax: e.target.value }))
                }
                autoComplete="off"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="notes" className="form-label">
                Notes
              </label>
              <textarea
                id="notes"
                className="form-control"
                rows={3}
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            {/* ── DELEGATION ───────────────────────────────────────────── */}
            <hr />
            <h6 className="text-muted mb-3">Delegation</h6>

            <div className="mb-3">
              <div className="form-check">
                <input
                  id="is_delegated"
                  type="checkbox"
                  className="form-check-input"
                  checked={form.is_delegated}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_delegated: e.target.checked,
                      vendor_name: e.target.checked ? prev.vendor_name : "",
                    }))
                  }
                />
                <label htmlFor="is_delegated" className="form-check-label">
                  Delegated to Vendor{" "}
                  <InfoTooltip text="Check if this pathway's contact is managed by a third-party vendor." />
                </label>
              </div>
            </div>

            {form.is_delegated && (
              <div className="mb-3">
                <label htmlFor="vendor_name" className="form-label">
                  Vendor Name{" "}
                  <span aria-hidden="true" className="text-danger">
                    *
                  </span>
                </label>
                <input
                  id="vendor_name"
                  type="text"
                  className={`form-control ${
                    fieldErrors.vendor_name ? "is-invalid" : ""
                  }`}
                  value={form.vendor_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      vendor_name: e.target.value,
                    }))
                  }
                  aria-required="true"
                  aria-invalid={fieldErrors.vendor_name ? "true" : undefined}
                  aria-describedby={
                    fieldErrors.vendor_name ? "vendor-name-error" : undefined
                  }
                  autoComplete="off"
                />
                {fieldErrors.vendor_name && (
                  <div className="invalid-feedback" id="vendor-name-error">
                    {fieldErrors.vendor_name}
                  </div>
                )}
              </div>
            )}

            <div className="d-flex gap-2 mt-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting
                  ? "Saving…"
                  : isEditing
                    ? "Save Pathway"
                    : "Create Pathway"}
              </button>
              <Link to="/admin/pathways" className="btn btn-outline-secondary">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
