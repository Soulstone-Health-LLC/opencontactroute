import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getWidgetAudiences,
  getWidgetPlans,
  getWidgetTopics,
  getWidgetPathway,
  postWidgetEvent,
} from "../../services/widgetService";

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = ["Who are you?", "Your plan", "Your topic"];
  return (
    <nav aria-label="Progress" className="mb-4">
      <ol className="list-unstyled d-flex gap-3 mb-0">
        {steps.map((label, i) => {
          const n = i + 1;
          const isCurrent = step === n;
          const isComplete = step > n;
          return (
            <li key={n} className="d-flex align-items-center gap-2">
              <span
                className={`badge rounded-pill ${
                  isComplete
                    ? "bg-success"
                    : isCurrent
                      ? "bg-primary"
                      : "bg-secondary"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? "✓" : n}
              </span>
              <span
                className={
                  isCurrent ? "fw-semibold" : isComplete ? "" : "text-muted"
                }
              >
                {label}
              </span>
              {n < steps.length && (
                <span className="text-muted" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── SELECTION CARD LIST ──────────────────────────────────────────────────────
function OptionList({ items, onSelect, loading, error, emptyMessage }) {
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }
  if (!items.length) {
    return <p className="text-muted">{emptyMessage}</p>;
  }
  return (
    <div className="list-group">
      {items.map((item) => (
        <button
          key={item._id}
          type="button"
          className="list-group-item list-group-item-action"
          onClick={() => onSelect(item)}
        >
          <div className="fw-semibold">{item.name}</div>
          {item.description && (
            <div className="text-muted small">{item.description}</div>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── RESULT CARD ──────────────────────────────────────────────────────────────
function PathwayResult({ pathway, onReset }) {
  const rows = [
    { label: "Department", value: pathway.department },
    { label: "Phone", value: pathway.phone },
    { label: "Email", value: pathway.email },
    { label: "Fax", value: pathway.fax },
    { label: "Portal", value: pathway.portal_url, isLink: true },
    { label: "Vendor", value: pathway.vendor_name },
    { label: "Notes", value: pathway.notes },
  ].filter((r) => r.value);

  return (
    <div>
      <h3 className="h5 mb-1">
        {pathway.audience_id?.name} &rsaquo; {pathway.plan_id?.name} &rsaquo;{" "}
        {pathway.topic_id?.name}
      </h3>
      {pathway.department && (
        <p className="text-muted small mb-3">{pathway.department}</p>
      )}

      {pathway.ivr_steps?.length > 0 && (
        <div className="mb-3">
          <p className="fw-semibold mb-1">IVR steps:</p>
          <ol className="mb-0">
            {pathway.ivr_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      <dl className="row mb-3">
        {rows.map(({ label, value, isLink }) => (
          <div key={label} className="col-sm-6 mb-2">
            <dt className="small text-muted">{label}</dt>
            <dd className="mb-0">
              {isLink ? (
                <a href={value} target="_blank" rel="noreferrer noopener">
                  {value}
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={onReset}
      >
        Start over
      </button>
    </div>
  );
}

// ─── MAIN WIDGET PAGE ─────────────────────────────────────────────────────────
export default function WidgetPage() {
  const [searchParams] = useSearchParams();
  const embedSource = searchParams.get("source") ?? "direct";

  const [step, setStep] = useState(1);
  const [audiences, setAudiences] = useState([]);
  const [plans, setPlans] = useState([]);
  const [topics, setTopics] = useState([]);
  const [pathway, setPathway] = useState(null);

  const [selectedAudience, setSelectedAudience] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load audiences on mount
  useEffect(() => {
    setLoading(true);
    getWidgetAudiences()
      .then((res) => setAudiences(res.data))
      .catch(() => setError("Failed to load options. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelectAudience(audience) {
    setSelectedAudience(audience);
    setError(null);
    setLoading(true);
    setStep(2);
    try {
      const res = await getWidgetPlans(audience._id);
      setPlans(res.data);
    } catch {
      setError("Failed to load plans. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPlan(plan) {
    setSelectedPlan(plan);
    setError(null);
    setLoading(true);
    setStep(3);
    try {
      const res = await getWidgetTopics(selectedAudience._id, plan._id);
      setTopics(res.data);
    } catch {
      setError("Failed to load topics. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectTopic(topic) {
    setSelectedTopic(topic);
    setError(null);
    setLoading(true);
    try {
      const res = await getWidgetPathway(
        selectedAudience._id,
        selectedPlan._id,
        topic._id,
      );
      setPathway(res.data);
      setStep(4);
      // Record the view event — fire-and-forget
      postWidgetEvent({
        pathway_id: res.data._id,
        audience_id: selectedAudience._id,
        plan_id: selectedPlan._id,
        topic_id: topic._id,
        embed_source: embedSource,
      }).catch(() => {});
    } catch {
      setError(
        "No contact information found for that combination. Please try a different selection.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep(1);
    setSelectedAudience(null);
    setSelectedPlan(null);
    setSelectedTopic(null);
    setPathway(null);
    setError(null);
    setPlans([]);
    setTopics([]);
  }

  function handleBack() {
    if (step === 2) {
      handleReset();
    } else if (step === 3) {
      setStep(2);
      setSelectedPlan(null);
      setTopics([]);
      setError(null);
    } else if (step === 4) {
      setStep(3);
      setPathway(null);
      setError(null);
    }
  }

  return (
    <div style={{ maxWidth: 560 }} className="mx-auto">
      <h2 className="h4 mb-1">Contact Support Directory</h2>
      <p className="text-muted small mb-4">
        Answer three quick questions to find the right contact.
      </p>

      {step < 4 && <StepIndicator step={step} />}

      {step > 1 && step < 4 && (
        <div className="mb-3 d-flex gap-2 text-muted small">
          {selectedAudience && (
            <span>
              <strong>Who:</strong> {selectedAudience.name}
            </span>
          )}
          {selectedPlan && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>
                <strong>Plan:</strong> {selectedPlan.name}
              </span>
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <section aria-labelledby="step1-heading">
          <h3 id="step1-heading" className="h6 mb-3">
            Who are you?
          </h3>
          <OptionList
            items={audiences}
            onSelect={handleSelectAudience}
            loading={loading}
            error={error}
            emptyMessage="No audiences available."
          />
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="step2-heading">
          <h3 id="step2-heading" className="h6 mb-3">
            Which plan are you on?
          </h3>
          <OptionList
            items={plans}
            onSelect={handleSelectPlan}
            loading={loading}
            error={error}
            emptyMessage="No plans available for this audience."
          />
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="step3-heading">
          <h3 id="step3-heading" className="h6 mb-3">
            What do you need help with?
          </h3>
          <OptionList
            items={topics}
            onSelect={handleSelectTopic}
            loading={loading}
            error={error}
            emptyMessage="No topics available for this plan."
          />
        </section>
      )}

      {step === 4 && pathway && (
        <section aria-labelledby="result-heading">
          <h3 id="result-heading" className="h6 mb-3">
            Here&rsquo;s your contact information
          </h3>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <PathwayResult pathway={pathway} onReset={handleReset} />
        </section>
      )}

      {step === 4 && !pathway && error && (
        <div>
          <div className="alert alert-warning" role="alert">
            {error}
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleReset}
          >
            Start over
          </button>
        </div>
      )}

      {step > 1 && step < 4 && !loading && (
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-decoration-none text-muted"
            onClick={handleBack}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
