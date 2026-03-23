import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { getAudiences } from "../../services/audienceService";
import { getPlans } from "../../services/planService";
import { getTopics } from "../../services/topicService";
import { getPathways } from "../../services/pathwayService";
import {
  getPathwayViews,
  getTopPathways,
  getTopTopics,
  getTopAudiences,
  getTopPlans,
} from "../../services/reportService";

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

function StatCard({ title, value, loading, to }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card h-100">
        <div className="card-body">
          <p className="text-muted small mb-1">{title}</p>
          {loading ? (
            <div
              className="placeholder-glow"
              aria-busy="true"
              aria-label={`Loading ${title}`}
            >
              <span className="placeholder col-4 fs-3" />
            </div>
          ) : (
            <p className="fs-3 fw-bold mb-0">{value}</p>
          )}
        </div>
        {to && (
          <div className="card-footer bg-transparent border-0 pt-0">
            <Link to={to} className="stretched-link small">
              View all
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [counts, setCounts] = useState({
    publishedPathways: 0,
    audiences: 0,
    plans: 0,
    topics: 0,
  });
  const [viewsData, setViewsData] = useState([]);
  const [viewsLoading, setViewsLoading] = useState(true);
  const [topPathways, setTopPathways] = useState([]);
  const [topTopics, setTopTopics] = useState([]);
  const [topAudiences, setTopAudiences] = useState([]);
  const [topPlans, setTopPlans] = useState([]);
  const [topLoading, setTopLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const [pathwaysRes, audiencesRes, plansRes, topicsRes] =
          await Promise.all([
            getPathways(),
            getAudiences(),
            getPlans(),
            getTopics(),
          ]);

        const publishedPathways = pathwaysRes.data.filter(
          (p) => p.status === "published",
        ).length;

        setCounts({
          publishedPathways,
          audiences: audiencesRes.data.filter((a) => a.is_active).length,
          plans: plansRes.data.filter((p) => p.is_active).length,
          topics: topicsRes.data.filter((t) => t.is_active).length,
        });
      } catch {
        setError("Failed to load dashboard data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    async function fetchViews() {
      setViewsLoading(true);
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        const fmt = (d) => d.toISOString().slice(0, 10);
        const res = await getPathwayViews({
          start_date: fmt(start),
          end_date: fmt(end),
          group_by: "day",
        });
        setViewsData(res.data.data ?? []);
      } catch {
        setViewsData([]);
      } finally {
        setViewsLoading(false);
      }
    }

    async function fetchTopData() {
      setTopLoading(true);
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        const fmt = (d) => d.toISOString().slice(0, 10);
        const params = { start_date: fmt(start), end_date: fmt(end) };
        const [pathwaysRes, topicsRes, audiencesRes, plansRes] =
          await Promise.all([
            getTopPathways({ ...params, limit: 10 }),
            getTopTopics(params),
            getTopAudiences(params),
            getTopPlans(params),
          ]);
        setTopPathways(pathwaysRes.data.data ?? []);
        setTopTopics(topicsRes.data.data ?? []);
        setTopAudiences(audiencesRes.data.data ?? []);
        setTopPlans(plansRes.data.data ?? []);
      } catch {
        // Non-critical — silently leave lists empty
      } finally {
        setTopLoading(false);
      }
    }

    fetchDashboardData();
    fetchViews();
    fetchTopData();
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Dashboard</h2>
        <Link to="/admin/reports" className="btn btn-outline-secondary btn-sm">
          View Reports
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row g-3 mb-4">
        <StatCard
          title="Published Pathways"
          value={counts.publishedPathways}
          loading={loading}
          to="/admin/pathways"
        />
        <StatCard
          title="Active Audiences"
          value={counts.audiences}
          loading={loading}
          to="/admin/audiences"
        />
        <StatCard
          title="Active Plans"
          value={counts.plans}
          loading={loading}
          to="/admin/plans"
        />
        <StatCard
          title="Active Topics"
          value={counts.topics}
          loading={loading}
          to="/admin/topics"
        />
      </div>

      <div className="card mb-4">
        <div className="card-header fw-semibold">
          Pathway Views — Last 30 Days
        </div>
        <div className="card-body">
          {viewsLoading ? (
            <div
              className="placeholder-glow"
              aria-busy="true"
              aria-label="Loading pathway views"
            >
              <span className="placeholder col-12" style={{ height: 200 }} />
            </div>
          ) : viewsData.length === 0 ? (
            <p className="text-muted mb-0">
              No view data for the last 30 days.
            </p>
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
        <div className="card-header fw-semibold">
          Top Pathways — Last 30 Days
        </div>
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
              {topLoading ? (
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

      {/* ── Top Topics / Audiences / Plans ───────────────────── */}
      <div className="row g-4 mb-4">
        {[
          { title: "Top Topics — Last 30 Days", data: topTopics, key: "topic" },
          {
            title: "Top Audiences — Last 30 Days",
            data: topAudiences,
            key: "audience",
          },
          { title: "Top Plans — Last 30 Days", data: topPlans, key: "plan" },
        ].map(({ title, data, key }) => (
          <div className="col-md-4" key={title}>
            <div className="card h-100">
              <div className="card-header fw-semibold">{title}</div>
              <div className="card-body">
                {topLoading ? (
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
    </div>
  );
}
