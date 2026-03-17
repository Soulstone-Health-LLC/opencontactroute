import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  getPathwayViews,
  getTopPathways,
  getTopTopics,
  getTopAudiences,
  getTopPlans,
  getPathwayCoverage,
  getContentAudit,
  getAuditLog,
} from "../../../services/reportService";
import { useAuth } from "../../../hooks/useAuth";
import Pagination from "../../../components/ui/Pagination";

function SectionError({ message }) {
  return (
    <div className="alert alert-danger" role="alert">
      {message}
    </div>
  );
}

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

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.user_role === "admin";

  // Date range
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("day");

  // Utilization data
  const [viewsData, setViewsData] = useState([]);
  const [topPathways, setTopPathways] = useState([]);
  const [topTopics, setTopTopics] = useState([]);
  const [topAudiences, setTopAudiences] = useState([]);
  const [topPlans, setTopPlans] = useState([]);
  const [utilizationLoading, setUtilizationLoading] = useState(true);
  const [utilizationError, setUtilizationError] = useState(null);

  // Coverage
  const [coverage, setCoverage] = useState(null);
  const [coverageLoading, setCoverageLoading] = useState(true);
  const [coverageError, setCoverageError] = useState(null);

  // Content audit
  const [contentRows, setContentRows] = useState([]);
  const [contentPage, setContentPage] = useState(1);
  const [contentTotalPages, setContentTotalPages] = useState(1);
  const [contentStatus, setContentStatus] = useState("");
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(null);

  // Audit log (admin only)
  const [auditRows, setAuditRows] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditResource, setAuditResource] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState(null);

  const fetchUtilization = useCallback(async () => {
    setUtilizationLoading(true);
    setUtilizationError(null);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const [viewsRes, pathwaysRes, topicsRes, audiencesRes, plansRes] =
        await Promise.all([
          getPathwayViews({ ...params, group_by: groupBy }),
          getTopPathways({ ...params, limit: 10 }),
          getTopTopics(params),
          getTopAudiences(params),
          getTopPlans(params),
        ]);

      setViewsData(viewsRes.data.data ?? []);
      setTopPathways(pathwaysRes.data.data ?? []);
      setTopTopics(topicsRes.data.data ?? []);
      setTopAudiences(audiencesRes.data.data ?? []);
      setTopPlans(plansRes.data.data ?? []);
    } catch {
      setUtilizationError("Failed to load utilization data.");
    } finally {
      setUtilizationLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  const fetchCoverage = useCallback(async () => {
    setCoverageLoading(true);
    setCoverageError(null);
    try {
      const res = await getPathwayCoverage();
      setCoverage(res.data);
    } catch {
      setCoverageError("Failed to load pathway coverage.");
    } finally {
      setCoverageLoading(false);
    }
  }, []);

  const fetchContentAudit = useCallback(async () => {
    setContentLoading(true);
    setContentError(null);
    try {
      const params = { page: contentPage, limit: 25 };
      if (contentStatus) params.status = contentStatus;
      const res = await getContentAudit(params);
      setContentRows(res.data.data ?? []);
      setContentTotalPages(res.data.pages ?? 1);
    } catch {
      setContentError("Failed to load content audit.");
    } finally {
      setContentLoading(false);
    }
  }, [contentPage, contentStatus]);

  const fetchAuditLog = useCallback(async () => {
    if (!isAdmin) return;
    setAuditLoading(true);
    setAuditError(null);
    try {
      const params = { page: auditPage, limit: 25 };
      if (auditResource) params.resource = auditResource;
      if (auditAction) params.action = auditAction;
      const res = await getAuditLog(params);
      setAuditRows(res.data.data ?? []);
      setAuditTotalPages(res.data.pages ?? 1);
    } catch {
      setAuditError("Failed to load audit log.");
    } finally {
      setAuditLoading(false);
    }
  }, [isAdmin, auditPage, auditResource, auditAction]);

  // Initial load
  useEffect(() => {
    fetchUtilization();
  }, [fetchUtilization]);
  useEffect(() => {
    fetchCoverage();
  }, [fetchCoverage]);
  useEffect(() => {
    fetchContentAudit();
  }, [fetchContentAudit]);
  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  function handleApplyDates(e) {
    e.preventDefault();
    fetchUtilization();
  }

  return (
    <div>
      <h2 className="mb-4">Reports</h2>

      {/* ── Date Range Filter ─────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={handleApplyDates}>
            <div className="col-auto">
              <label
                className="form-label mb-1 small text-muted"
                htmlFor="start-date"
              >
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <label
                className="form-label mb-1 small text-muted"
                htmlFor="end-date"
              >
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <label
                className="form-label mb-1 small text-muted"
                htmlFor="group-by"
              >
                Group By
              </label>
              <select
                id="group-by"
                className="form-select form-select-sm"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
            <div className="col-auto">
              <button type="submit" className="btn btn-primary btn-sm">
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Utilization Error ─────────────────────────────────── */}
      {utilizationError && <SectionError message={utilizationError} />}

      {/* ── Pathway Views Over Time ───────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Pathway Views Over Time</div>
        <div className="card-body">
          {utilizationLoading ? (
            <div
              className="placeholder-glow"
              aria-busy="true"
              aria-label="Loading pathway views"
            >
              <span className="placeholder col-12" style={{ height: 200 }} />
            </div>
          ) : viewsData.length === 0 ? (
            <p className="text-muted mb-0">No data for the selected period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={viewsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Views"
                  stroke="#0d6efd"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top Pathways ─────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Top Pathways</div>
        <div className="card-body p-0">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Audience › Plan › Topic</th>
                <th>Department</th>
                <th className="text-end">Views</th>
              </tr>
            </thead>
            <tbody>
              {utilizationLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <LoadingRow key={i} cols={4} />
                ))
              ) : topPathways.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted text-center py-3">
                    No data available.
                  </td>
                </tr>
              ) : (
                topPathways.map((row, idx) => (
                  <tr key={row.pathway_id ?? idx}>
                    <td>{idx + 1}</td>
                    <td>
                      {row.audience?.name} › {row.plan?.name} ›{" "}
                      {row.topic?.name}
                    </td>
                    <td>{row.department ?? "—"}</td>
                    <td className="text-end">{row.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bar Charts Row ────────────────────────────────────── */}
      <div className="row g-4 mb-4">
        {[
          { title: "Top Topics", data: topTopics, key: "topic" },
          { title: "Top Audiences", data: topAudiences, key: "audience" },
          { title: "Top Plans", data: topPlans, key: "plan" },
        ].map(({ title, data, key }) => (
          <div className="col-md-4" key={title}>
            <div className="card h-100">
              <div className="card-header fw-semibold">{title}</div>
              <div className="card-body">
                {utilizationLoading ? (
                  <div
                    className="placeholder-glow"
                    aria-busy="true"
                    aria-label={`Loading ${title}`}
                  >
                    <span
                      className="placeholder col-12"
                      style={{ height: 200 }}
                    />
                  </div>
                ) : data.length === 0 ? (
                  <p className="text-muted mb-0">No data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={data.map((d) => ({
                        name: d[key]?.name,
                        count: d.count,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Views" fill="#0d6efd" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pathway Coverage ─────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Pathway Coverage</div>
        <div className="card-body">
          {coverageError && <SectionError message={coverageError} />}
          {coverageLoading ? (
            <div className="row g-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="col-sm-6 col-xl-3">
                  <div className="card">
                    <div
                      className="card-body placeholder-glow"
                      aria-busy="true"
                    >
                      <span className="placeholder col-8 fs-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : coverage ? (
            <>
              <div className="row g-3 mb-3">
                {[
                  { label: "Total Possible", value: coverage.total_possible },
                  { label: "Published", value: coverage.published },
                  { label: "Draft", value: coverage.draft },
                  { label: "Uncovered", value: coverage.uncovered },
                ].map(({ label, value }) => (
                  <div key={label} className="col-sm-6 col-xl-3">
                    <div className="card">
                      <div className="card-body">
                        <p className="text-muted small mb-1">{label}</p>
                        <p className="fs-3 fw-bold mb-0">{value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {coverage.uncovered_combinations?.length > 0 && (
                <details>
                  <summary
                    className="small text-muted"
                    style={{ cursor: "pointer" }}
                  >
                    Show {coverage.uncovered_combinations.length} uncovered
                    combinations
                  </summary>
                  <ul className="mt-2 small list-unstyled ps-2">
                    {coverage.uncovered_combinations.map((combo, i) => (
                      <li key={i}>
                        {combo.audience?.name ?? combo.audience_id} ›{" "}
                        {combo.plan?.name ?? combo.plan_id} ›{" "}
                        {combo.topic?.name ?? combo.topic_id}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* ── Content Audit ─────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold d-flex align-items-center justify-content-between gap-2">
          <span>Content Audit</span>
          <select
            className="form-select form-select-sm w-auto"
            value={contentStatus}
            onChange={(e) => {
              setContentStatus(e.target.value);
              setContentPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        {contentError && (
          <div className="card-body pb-0">
            <SectionError message={contentError} />
          </div>
        )}
        <div className="card-body p-0">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Audience</th>
                <th>Plan</th>
                <th>Topic</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Updated By</th>
              </tr>
            </thead>
            <tbody>
              {contentLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <LoadingRow key={i} cols={6} />
                ))
              ) : contentRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted text-center py-3">
                    No pathways found.
                  </td>
                </tr>
              ) : (
                contentRows.map((row, idx) => (
                  <tr key={row._id ?? idx}>
                    <td>{row.audience_id?.name ?? "—"}</td>
                    <td>{row.plan_id?.name ?? "—"}</td>
                    <td>{row.topic_id?.name ?? "—"}</td>
                    <td>
                      <span
                        className={`badge ${row.status === "published" ? "bg-success" : "bg-secondary"}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>
                      {row.updatedAt
                        ? new Date(row.updatedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>{row.updated_by?.email ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer bg-transparent">
          <Pagination
            page={contentPage}
            totalPages={contentTotalPages}
            onPageChange={setContentPage}
          />
        </div>
      </div>

      {/* ── Audit Log (admin only) ────────────────────────────── */}
      {isAdmin && (
        <div className="card mb-4">
          <div className="card-header fw-semibold d-flex align-items-center gap-2 flex-wrap">
            <span>Audit Log</span>
            <select
              className="form-select form-select-sm w-auto"
              value={auditResource}
              onChange={(e) => {
                setAuditResource(e.target.value);
                setAuditPage(1);
              }}
              aria-label="Filter by resource"
            >
              <option value="">All Resources</option>
              <option value="ContactPathway">ContactPathway</option>
              <option value="Audience">Audience</option>
              <option value="Plan">Plan</option>
              <option value="Topic">Topic</option>
              <option value="User">User</option>
            </select>
            <select
              className="form-select form-select-sm w-auto"
              value={auditAction}
              onChange={(e) => {
                setAuditAction(e.target.value);
                setAuditPage(1);
              }}
              aria-label="Filter by action"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </select>
          </div>
          {auditError && (
            <div className="card-body pb-0">
              <SectionError message={auditError} />
            </div>
          )}
          <div className="card-body p-0">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Resource</th>
                  <th>Action</th>
                  <th>Changed By</th>
                  <th>Date</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <LoadingRow key={i} cols={5} />
                  ))
                ) : auditRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted text-center py-3">
                      No audit entries found.
                    </td>
                  </tr>
                ) : (
                  auditRows.map((row, idx) => (
                    <tr key={row._id ?? idx}>
                      <td>{row.resource}</td>
                      <td>
                        <span
                          className={`badge ${
                            row.action === "create"
                              ? "bg-success"
                              : row.action === "delete"
                                ? "bg-danger"
                                : "bg-primary"
                          }`}
                        >
                          {row.action}
                        </span>
                      </td>
                      <td>{row.changed_by?.email ?? "—"}</td>
                      <td>
                        {row.changed_at
                          ? new Date(row.changed_at).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        {row.changes?.length > 0 ? (
                          <ul className="mb-0 ps-3 small">
                            {row.changes.map((c, ci) => (
                              <li key={ci}>
                                <strong>{c.field}</strong>:{" "}
                                {String(c.old_value)} → {String(c.new_value)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="card-footer bg-transparent">
            <Pagination
              page={auditPage}
              totalPages={auditTotalPages}
              onPageChange={setAuditPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
