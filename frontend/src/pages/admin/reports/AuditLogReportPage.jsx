import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Pagination from "../../../components/ui/Pagination";
import { exportToCsv } from "../../../utils/exportCsv";
import { getAuditLog } from "../../../services/reportService";
import { getUsers } from "../../../services/userService";
import InfoTooltip from "../../../components/ui/InfoTooltip";
import {
  toLocalDateInputValue,
  localDayStartISO,
  localDayEndISO,
} from "../../../utils/dateUtils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function defaultDates() {
  const today = toLocalDateInputValue(new Date());
  return { start: today, end: today };
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_BADGE = {
  create: "bg-success",
  update: "bg-primary",
  delete: "bg-danger",
};

const RESOURCE_OPTIONS = [
  "Audience",
  "ContactPathway",
  "Person",
  "Plan",
  "SiteConfig",
  "Topic",
  "User",
];

function LoadingRow() {
  return (
    <tr aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => (
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
  "Date/Time",
  "User",
  "Action",
  "Resource",
  "Resource ID",
  "Field",
  "Before",
  "After",
];

export default function AuditLogReportPage() {
  const defaults = defaultDates();

  // Filter inputs (controlled)
  const [resourceFilter, setResourceFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);

  // Applied filter (what drives the fetch)
  const [applied, setApplied] = useState({
    resource: "",
    action: "",
    changed_by: "",
    start_date: defaults.start,
    end_date: defaults.end,
  });

  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Users list for filter dropdown
  const [users, setUsers] = useState([]);
  useEffect(() => {
    getUsers()
      .then((res) => setUsers(res.data ?? []))
      .catch(() => {}); // non-critical — filter just stays empty
  }, []);

  const fetchData = useCallback(async (filters, pageNum) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pageNum, limit: PAGE_SIZE };
      if (filters.resource) params.resource = filters.resource;
      if (filters.action) params.action = filters.action;
      if (filters.changed_by) params.changed_by = filters.changed_by;
      if (filters.start_date)
        params.start_date = localDayStartISO(filters.start_date);
      if (filters.end_date) params.end_date = localDayEndISO(filters.end_date);
      const res = await getAuditLog(params);
      setResult(res.data);
    } catch {
      setError("Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(applied, page);
  }, [applied, page, fetchData]);

  function handleApply(e) {
    e.preventDefault();
    setPage(1);
    setApplied({
      resource: resourceFilter,
      action: actionFilter,
      changed_by: userFilter,
      start_date: startDate,
      end_date: endDate,
    });
  }

  function handleReset() {
    const d = defaultDates();
    setResourceFilter("");
    setActionFilter("");
    setUserFilter("");
    setStartDate(d.start);
    setEndDate(d.end);
    setPage(1);
    setApplied({
      resource: "",
      action: "",
      changed_by: "",
      start_date: d.start,
      end_date: d.end,
    });
  }

  const rows = result?.data ?? [];
  const totalPages = result?.pages ?? 1;
  const totalItems = result?.total ?? 0;

  function handleExport() {
    exportToCsv(
      "audit-log.csv",
      CSV_HEADERS,
      rows.flatMap((r) => {
        const changes = r.changes?.length > 0 ? r.changes : [null];
        return changes.map((c) => [
          formatDateTime(r.changed_at),
          r.changed_by?.email ?? "—",
          r.action ?? "—",
          r.resource ?? "—",
          r.resource_id ?? "—",
          c ? c.field : "—",
          c ? String(c.old_value ?? "—") : "—",
          c ? String(c.new_value ?? "—") : "—",
        ]);
      }),
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Back link */}
      <Link to="/admin/reports" className="btn btn-link ps-0 mb-2">
        &larr; Reports
      </Link>

      <h2 className="mb-4">Audit Log</h2>

      {/* Filter bar */}
      <form
        className="card mb-4"
        onSubmit={handleApply}
        aria-label="Filter form"
      >
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-sm-6 col-md-2">
              <label htmlFor="resourceSelect" className="form-label">
                Resource
              </label>
              <select
                id="resourceSelect"
                className="form-select form-select-sm"
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
              >
                <option value="">All</option>
                {RESOURCE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-sm-6 col-md-2">
              <label htmlFor="actionSelect" className="form-label">
                Action
              </label>
              <select
                id="actionSelect"
                className="form-select form-select-sm"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>

            <div className="col-sm-6 col-md-3">
              <label htmlFor="userSelect" className="form-label">
                User
              </label>
              <select
                id="userSelect"
                className="form-select form-select-sm"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <option value="">All</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-sm-6 col-md-2">
              <label htmlFor="startDate" className="form-label">
                From
              </label>
              <input
                type="date"
                id="startDate"
                className="form-control form-control-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="col-sm-6 col-md-2">
              <label htmlFor="endDate" className="form-label">
                To
              </label>
              <input
                type="date"
                id="endDate"
                className="form-control form-control-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2 d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary btn-sm flex-fill"
              >
                Apply
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm flex-fill"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Results card */}
      <div className="card">
        <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
          <span>
            Log Entries
            {!loading && result && (
              <span className="text-muted fw-normal ms-2 small">
                ({totalItems.toLocaleString()} total)
              </span>
            )}
          </span>
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
                    <th>Date/Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>
                      <span className="d-flex align-items-center gap-1">
                        Resource ID
                        <InfoTooltip
                          text="The unique database ID of the record that was created, updated, or deleted. Shown truncated; the full ID is included in the CSV export."
                          placement="top"
                        />
                      </span>
                    </th>
                    <th>Field</th>
                    <th>Before</th>
                    <th>After</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <LoadingRow key={i} />
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No log entries found.
                      </td>
                    </tr>
                  ) : (
                    rows.flatMap((r) => {
                      const changes =
                        r.changes?.length > 0 ? r.changes : [null];
                      return changes.map((c, idx) => (
                        <tr
                          key={`${r._id}-${idx}`}
                          style={idx > 0 ? { borderTop: "none" } : undefined}
                        >
                          {idx === 0 && (
                            <>
                              <td
                                className="text-nowrap"
                                rowSpan={changes.length}
                              >
                                {formatDateTime(r.changed_at)}
                              </td>
                              <td rowSpan={changes.length}>
                                {r.changed_by?.email ?? "—"}
                              </td>
                              <td rowSpan={changes.length}>
                                <span
                                  className={`badge ${ACTION_BADGE[r.action] ?? "bg-secondary"}`}
                                >
                                  {r.action}
                                </span>
                              </td>
                              <td rowSpan={changes.length}>{r.resource}</td>
                              <td
                                className="font-monospace small text-muted"
                                rowSpan={changes.length}
                              >
                                {String(r.resource_id ?? "—").slice(0, 8)}
                                &hellip;
                              </td>
                            </>
                          )}
                          <td className="font-monospace small">
                            {c ? c.field : "—"}
                          </td>
                          <td className="small text-danger">
                            {c ? String(c.old_value ?? "—") : "—"}
                          </td>
                          <td className="small text-success">
                            {c ? String(c.new_value ?? "—") : "—"}
                          </td>
                        </tr>
                      ));
                    })
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
