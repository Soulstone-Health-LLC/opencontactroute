import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import InfoTooltip from "../../../components/ui/InfoTooltip";
import { exportToCsv } from "../../../utils/exportCsv";
import { getPathwayCoverage } from "../../../services/reportService";

// ── Helpers ──────────────────────────────────────────────────────────────────

function LoadingRow({ cols }) {
  return (
    <tr aria-busy="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <span className="placeholder col-8" />
        </td>
      ))}
    </tr>
  );
}

// ── CombinationsTable ────────────────────────────────────────────────────────

function CombinationsTable({
  title,
  rows,
  filename,
  emptyMessage,
  showDepartment = false,
  tooltip,
  loading,
}) {
  const cols = showDepartment ? 4 : 3;
  const headers = showDepartment
    ? ["Audience", "Plan", "Topic", "Department"]
    : ["Audience", "Plan", "Topic"];
  return (
    <div className="card mb-4">
      <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
        <span className="d-flex align-items-center gap-2">
          {title}
          {tooltip && <InfoTooltip text={tooltip} />}
        </span>
        <button
          className="btn btn-outline-secondary btn-sm"
          disabled={loading || rows.length === 0}
          onClick={() =>
            exportToCsv(
              filename,
              headers,
              rows.map((r) =>
                showDepartment
                  ? [
                      r.audience?.name,
                      r.plan?.name,
                      r.topic?.name,
                      r.department ?? "—",
                    ]
                  : [r.audience?.name, r.plan?.name, r.topic?.name],
              ),
            )
          }
        >
          Export CSV
        </button>
      </div>
      <div className="card-body p-0">
        <table className="table table-sm table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>Audience</th>
              <th>Plan</th>
              <th>Topic</th>
              {showDepartment && <th>Department</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <LoadingRow key={i} cols={cols} />
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={cols} className="text-muted text-center py-3">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.audience?.name}</td>
                  <td>{row.plan?.name}</td>
                  <td>{row.topic?.name}</td>
                  {showDepartment && <td>{row.department ?? "—"}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CoverageReportPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPathwayCoverage()
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load coverage data."))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Total Possible",
      value: data?.total_possible ?? "—",
      className: "text-secondary",
    },
    {
      label: "Published",
      value: data?.published ?? "—",
      className: "text-success",
    },
    {
      label: "Draft",
      value: data?.draft ?? "—",
      className: "text-warning",
    },
    {
      label: "Uncovered",
      value: data?.uncovered ?? "—",
      className: "text-danger",
    },
  ];

  const uncovered = data?.uncovered_combinations ?? [];
  const published = data?.published_combinations ?? [];
  const draft = data?.draft_combinations ?? [];

  return (
    <div>
      {/* ── Back + Heading ─────────────────────────────────── */}
      <Link
        to="/admin/reports"
        className="text-muted small d-inline-block mb-2"
      >
        ← Reports
      </Link>
      <h2 className="mb-4">Pathway Coverage</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── Summary Stats ──────────────────────────────────── */}
      <div className="row g-3 mb-4">
        {stats.map(({ label, value, className }) => (
          <div key={label} className="col-6 col-md-3">
            <div className="card text-center h-100">
              <div className="card-body">
                {loading ? (
                  <div className="display-6 fw-bold text-secondary">
                    <span className="placeholder col-4" />
                  </div>
                ) : (
                  <div className={`display-6 fw-bold ${className}`}>
                    {value}
                  </div>
                )}
                <div className="text-muted small mt-1">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CombinationsTable
        title="Published Combinations"
        rows={published}
        filename="published-combinations.csv"
        emptyMessage="No published combinations."
        showDepartment
        loading={loading}
      />
      <CombinationsTable
        title="Draft Combinations"
        rows={draft}
        filename="draft-combinations.csv"
        emptyMessage="No draft combinations."
        showDepartment
        loading={loading}
      />
      <CombinationsTable
        title="Uncovered Combinations"
        rows={uncovered}
        filename="uncovered-combinations.csv"
        emptyMessage="All combinations are covered."
        tooltip="Audience + Plan + Topic combinations that exist in the system but have no pathway created yet."
        loading={loading}
      />
    </div>
  );
}
