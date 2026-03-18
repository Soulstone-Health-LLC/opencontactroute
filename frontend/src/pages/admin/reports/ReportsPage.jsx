import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

const ALL_REPORTS = [
  {
    id: "utilization",
    title: "Pathway Utilization",
    description:
      "Analyze pathway usage over a custom date range. See views over time and top-performing pathways, topics, audiences, and plans.",
  },
  {
    id: "coverage",
    title: "Pathway Coverage",
    description:
      "Identify which audience / plan / topic combinations have published pathways and which gaps remain.",
  },
  {
    id: "content-audit",
    title: "Content Audit",
    description:
      "Review the status and recency of all pathways in the system. Filter by status to focus on published or draft content.",
  },
  {
    id: "audit-log",
    title: "Audit Log",
    description:
      "Track all changes made to system resources. Filter by resource type, action, date range, and user.",
    adminOnly: true,
  },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.user_role === "admin";
  const navigate = useNavigate();

  const reports = ALL_REPORTS.filter((r) => !r.adminOnly || isAdmin);

  return (
    <div>
      <h2 className="mb-4">Reports</h2>
      <div className="row g-4">
        {reports.map((report) => (
          <div key={report.id} className="col-md-6">
            <div
              className="card h-100 shadow-sm"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(report.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(report.id);
              }}
            >
              <div className="card-body">
                <h5 className="card-title mb-3">{report.title}</h5>
                <p className="card-text text-muted mb-0">
                  {report.description}
                </p>
              </div>
              <div className="card-footer bg-transparent text-end">
                <span className="small text-primary">Run report →</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
