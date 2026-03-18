import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
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
import { getContentAudit, getPathwayViews } from "../../services/reportService";

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
  const [recentPathways, setRecentPathways] = useState([]);
  const [viewsData, setViewsData] = useState([]);
  const [viewsLoading, setViewsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const [pathwaysRes, audiencesRes, plansRes, topicsRes, auditRes] =
          await Promise.all([
            getPathways(),
            getAudiences(),
            getPlans(),
            getTopics(),
            getContentAudit({ limit: 5 }),
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

        setRecentPathways(auditRes.data.data.slice(0, 5));
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

    fetchDashboardData();
    fetchViews();
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

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Recently Updated Pathways</h5>
          <Link to="/admin/pathways" className="small">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="card-body text-center py-4" aria-busy="true">
            <div
              className="spinner-border spinner-border-sm text-secondary"
              role="status"
            >
              <span className="visually-hidden">Loading…</span>
            </div>
          </div>
        ) : recentPathways.length === 0 ? (
          <div className="card-body">
            <p className="text-muted mb-0">No pathways found.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Audience</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Topic</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last Updated</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentPathways.map((pathway) => (
                  <tr key={pathway._id}>
                    <td>{pathway.audience_id?.name ?? "—"}</td>
                    <td>{pathway.plan_id?.name ?? "—"}</td>
                    <td>{pathway.topic_id?.name ?? "—"}</td>
                    <td>
                      <span
                        className={`badge ${
                          pathway.status === "published"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {pathway.status}
                      </span>
                    </td>
                    <td>
                      {pathway.updatedAt
                        ? new Date(pathway.updatedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="text-end">
                      <Link
                        to={`/admin/pathways/${pathway._id}/edit`}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
