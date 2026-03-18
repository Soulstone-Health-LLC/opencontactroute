import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Pagination from "../../../components/ui/Pagination";
import { exportToCsv } from "../../../utils/exportCsv";
import { getContentAudit } from "../../../services/reportService";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  published: "bg-success",
  draft: "bg-warning text-dark",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function LoadingRow() {
  return (
    <tr aria-busy="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i}>
          <span className="placeholder col-8" />
        </td>
      ))}
    </tr>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;
const CSV_HEADERS = [
  "Audience",
  "Plan",
  "Topic",
  "Department",
  "Status",
  "Last Updated",
  "Updated By",
];

export default function ContentAuditReportPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (status, pageNum) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pageNum, limit: PAGE_SIZE };
      if (status) params.status = status;
      const res = await getContentAudit(params);
      setResult(res.data);
    } catch {
      setError("Failed to load content audit data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(appliedStatus, page);
  }, [appliedStatus, page, fetchData]);

  function handleApply(e) {
    e.preventDefault();
    setPage(1);
    setAppliedStatus(statusFilter);
  }

  const rows = result?.data ?? [];
  const totalPages = result?.pages ?? 1;
  const totalItems = result?.total ?? 0;

  function handleExport() {
    exportToCsv(
      "content-audit.csv",
      CSV_HEADERS,
      rows.map((r) => [
        r.audience_id?.name ?? "—",
        r.plan_id?.name ?? "—",
        r.topic_id?.name ?? "—",
        r.department ?? "—",
        r.status ?? "—",
        formatDate(r.updatedAt),
        r.updated_by?.email ?? "—",
      ]),
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Back link */}
      <Link to="/admin/reports" className="btn btn-link ps-0 mb-2">
        &larr; Reports
      </Link>

      <h2 className="mb-4">Content Audit</h2>

      {/* Filter bar */}
      <form
        className="row g-2 align-items-end mb-4"
        onSubmit={handleApply}
        aria-label="Filter form"
      >
        <div className="col-auto">
          <label htmlFor="statusSelect" className="form-label mb-1">
            Status
          </label>
          <select
            id="statusSelect"
            className="form-select form-select-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary btn-sm">
            Apply
          </button>
        </div>
      </form>

      {/* Results card */}
      <div className="card">
        <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
          <span>Pathways</span>
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={loading || rows.length === 0}
            onClick={handleExport}
          >
            Export CSV
          </button>
        </div>

        <div className="card-body p-0">
          {error ? (
            <div className="alert alert-danger m-3" role="alert">
              {error}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Audience</th>
                    <th>Plan</th>
                    <th>Topic</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Updated By</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <LoadingRow key={i} />
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No pathways found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r._id}>
                        <td>{r.audience_id?.name ?? "—"}</td>
                        <td>{r.plan_id?.name ?? "—"}</td>
                        <td>{r.topic_id?.name ?? "—"}</td>
                        <td>{r.department ?? "—"}</td>
                        <td>
                          <span
                            className={`badge ${STATUS_BADGE[r.status] ?? "bg-secondary"}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td>{formatDate(r.updatedAt)}</td>
                        <td>{r.updated_by?.email ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!error && !loading && rows.length > 0 && (
          <div className="card-footer">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalItems}
              perPage={PAGE_SIZE}
            />
          </div>
        )}
      </div>
    </div>
  );
}
