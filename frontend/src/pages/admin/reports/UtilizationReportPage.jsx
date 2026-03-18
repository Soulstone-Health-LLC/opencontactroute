import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { exportToCsv } from "../../../utils/exportCsv";
import {
  getPathwayViews,
  getTopPathways,
  getTopTopics,
  getTopAudiences,
  getTopPlans,
} from "../../../services/reportService";
import {
  toLocalDateInputValue,
  localDayStartISO,
  localDayEndISO,
} from "../../../utils/dateUtils";

// ── Helpers ──────────────────────────────────────────────────────────────────

function defaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    start: toLocalDateInputValue(start),
    end: toLocalDateInputValue(end),
  };
}

function SectionError({ message }) {
  return (
    <div className="alert alert-danger mb-0" role="alert">
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function UtilizationReportPage() {
  const defaults = defaultDates();

  // Filter state
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [groupBy, setGroupBy] = useState("day");
  const [topN, setTopN] = useState(10);

  // Views over time
  const [viewsData, setViewsData] = useState([]);
  const [viewsLoading, setViewsLoading] = useState(true);
  const [viewsError, setViewsError] = useState(null);

  // Top pathways
  const [topPathways, setTopPathways] = useState([]);
  const [pathwaysLoading, setPathwaysLoading] = useState(true);
  const [pathwaysError, setPathwaysError] = useState(null);

  // Top topics / audiences / plans
  const [topTopics, setTopTopics] = useState([]);
  const [topAudiences, setTopAudiences] = useState([]);
  const [topPlans, setTopPlans] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState(null);

  const fetchViews = useCallback(async (start, end, group) => {
    setViewsLoading(true);
    setViewsError(null);
    try {
      const params = { group_by: group };
      if (start) params.start_date = localDayStartISO(start);
      if (end) params.end_date = localDayEndISO(end);
      const res = await getPathwayViews(params);
      setViewsData(res.data.data ?? []);
    } catch {
      setViewsError("Failed to load pathway views.");
    } finally {
      setViewsLoading(false);
    }
  }, []);

  const fetchTopPathways = useCallback(async (start, end, limit) => {
    setPathwaysLoading(true);
    setPathwaysError(null);
    try {
      const params = { limit };
      if (start) params.start_date = localDayStartISO(start);
      if (end) params.end_date = localDayEndISO(end);
      const res = await getTopPathways(params);
      setTopPathways(res.data.data ?? []);
    } catch {
      setPathwaysError("Failed to load top pathways.");
    } finally {
      setPathwaysLoading(false);
    }
  }, []);

  const fetchTables = useCallback(async (start, end, limit) => {
    setTablesLoading(true);
    setTablesError(null);
    try {
      const params = { limit };
      if (start) params.start_date = localDayStartISO(start);
      if (end) params.end_date = localDayEndISO(end);
      const [topicsRes, audiencesRes, plansRes] = await Promise.all([
        getTopTopics(params),
        getTopAudiences(params),
        getTopPlans(params),
      ]);
      setTopTopics(topicsRes.data.data ?? []);
      setTopAudiences(audiencesRes.data.data ?? []);
      setTopPlans(plansRes.data.data ?? []);
    } catch {
      setTablesError("Failed to load top topics, audiences, or plans.");
    } finally {
      setTablesLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchViews(defaults.start, defaults.end, "day");
    fetchTopPathways(defaults.start, defaults.end, 10);
    fetchTables(defaults.start, defaults.end, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApply(e) {
    e.preventDefault();
    fetchViews(startDate, endDate, groupBy);
    fetchTopPathways(startDate, endDate, topN);
    fetchTables(startDate, endDate, topN);
  }

  return (
    <div>
      {/* ── Back + Heading ─────────────────────────────────── */}
      <Link
        to="/admin/reports"
        className="text-muted small d-inline-block mb-2"
      >
        ← Reports
      </Link>
      <h2 className="mb-4">Pathway Utilization</h2>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={handleApply}>
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
              <label
                className="form-label mb-1 small text-muted"
                htmlFor="top-n"
              >
                Show Top
              </label>
              <select
                id="top-n"
                className="form-select form-select-sm"
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
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

      {/* ── Pathway Views Over Time ─────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
          Pathway Views Over Time
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={viewsLoading || viewsData.length === 0}
            onClick={() =>
              exportToCsv(
                "pathway-views.csv",
                ["Period", "Views"],
                viewsData.map((r) => [r.period, r.count]),
              )
            }
          >
            Export CSV
          </button>
        </div>
        {viewsError && (
          <div className="card-body pb-0">
            <SectionError message={viewsError} />
          </div>
        )}
        <div className="card-body p-0">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Period</th>
                <th className="text-end">Views</th>
              </tr>
            </thead>
            <tbody>
              {viewsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <LoadingRow key={i} cols={2} />
                ))
              ) : viewsData.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-muted text-center py-3">
                    No data for the selected period.
                  </td>
                </tr>
              ) : (
                viewsData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.period}</td>
                    <td className="text-end">{row.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Top Pathways ───────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
          Top Pathways
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={pathwaysLoading || topPathways.length === 0}
            onClick={() =>
              exportToCsv(
                "top-pathways.csv",
                ["#", "Audience", "Plan", "Topic", "Department", "Views"],
                topPathways.map((r, i) => [
                  i + 1,
                  r.audience?.name,
                  r.plan?.name,
                  r.topic?.name,
                  r.department ?? "—",
                  r.count,
                ]),
              )
            }
          >
            Export CSV
          </button>
        </div>
        {pathwaysError && (
          <div className="card-body pb-0">
            <SectionError message={pathwaysError} />
          </div>
        )}
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
              {pathwaysLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <LoadingRow key={i} cols={4} />
                ))
              ) : topPathways.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted text-center py-3">
                    No data for the selected period.
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

      {/* ── Top Topics / Audiences / Plans ─────────────────── */}
      {tablesError && (
        <div className="mb-4">
          <SectionError message={tablesError} />
        </div>
      )}
      <div className="d-flex flex-column gap-4 mb-4">
        {[
          {
            title: "Top Topics",
            data: topTopics,
            nameKey: "topic",
            filename: "top-topics.csv",
          },
          {
            title: "Top Audiences",
            data: topAudiences,
            nameKey: "audience",
            filename: "top-audiences.csv",
          },
          {
            title: "Top Plans",
            data: topPlans,
            nameKey: "plan",
            filename: "top-plans.csv",
          },
        ].map(({ title, data, nameKey, filename }) => (
          <div key={title}>
            <div className="card">
              <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
                {title}
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={tablesLoading || data.length === 0}
                  onClick={() =>
                    exportToCsv(
                      filename,
                      ["#", "Name", "Views"],
                      data.map((r, i) => [i + 1, r[nameKey]?.name, r.count]),
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
                      <th>#</th>
                      <th>Name</th>
                      <th className="text-end">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablesLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <LoadingRow key={i} cols={3} />
                      ))
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-muted text-center py-3">
                          No data available.
                        </td>
                      </tr>
                    ) : (
                      data.map((row, idx) => (
                        <tr key={row[nameKey]?._id ?? idx}>
                          <td>{idx + 1}</td>
                          <td>{row[nameKey]?.name}</td>
                          <td className="text-end">{row.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
