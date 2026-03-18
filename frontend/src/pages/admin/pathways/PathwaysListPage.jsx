import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPathways,
  publishPathway,
  unpublishPathway,
  deletePathway,
} from "../../../services/pathwayService";
import { toast } from "react-toastify";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import Pagination from "../../../components/ui/Pagination";
import { useAuth } from "../../../hooks/useAuth";

const PER_PAGE = 20;

export default function PathwaysListPage() {
  const { user } = useAuth();
  const canModify =
    user?.user_role === "admin" || user?.user_role === "super user";

  const [pathways, setPathways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    getPathways()
      .then((res) => setPathways(res.data))
      .catch(() => setError("Failed to load pathways."))
      .finally(() => setLoading(false));
  }, []);

  const getValue = (pw, key) => {
    if (key === "audience") return pw.audience_id?.name ?? "";
    if (key === "plan") return pw.plan_id?.name ?? "";
    if (key === "topic") return pw.topic_id?.name ?? "";
    if (key === "department") return pw.department ?? "";
    return "";
  };

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const filtered = pathways.filter((pw) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      pw.audience_id?.name?.toLowerCase().includes(q) ||
      pw.plan_id?.name?.toLowerCase().includes(q) ||
      pw.topic_id?.name?.toLowerCase().includes(q) ||
      pw.department?.toLowerCase().includes(q)
    );
  });

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = getValue(a, sortKey).toLowerCase();
        const bv = getValue(b, sortKey).toLowerCase();
        const cmp = av.localeCompare(bv);
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const pageItems = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function handlePublish(pw) {
    setActionError(null);
    try {
      const res = await publishPathway(pw._id);
      setPathways((prev) => prev.map((p) => (p._id === pw._id ? res.data : p)));
      toast.success("Pathway published.");
    } catch {
      setActionError("Failed to publish pathway.");
    }
  }

  async function handleUnpublish(pw) {
    setActionError(null);
    try {
      const res = await unpublishPathway(pw._id);
      setPathways((prev) => prev.map((p) => (p._id === pw._id ? res.data : p)));
      toast.success("Pathway unpublished.");
    } catch {
      setActionError("Failed to unpublish pathway.");
    }
  }

  async function handleDeleteConfirm() {
    setActionError(null);
    try {
      await deletePathway(toDelete._id);
      setPathways((prev) => prev.filter((p) => p._id !== toDelete._id));
      toast.success("Pathway deleted.");
    } catch {
      setActionError("Failed to delete pathway.");
    } finally {
      setToDelete(null);
    }
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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Contact Pathways</h2>
        {canModify && (
          <Link to="/admin/pathways/new" className="btn btn-primary btn-sm">
            + New Pathway
          </Link>
        )}
      </div>

      {(error || actionError) && (
        <div className="alert alert-danger" role="alert">
          {error || actionError}
        </div>
      )}

      <div className="mb-3">
        <input
          type="search"
          className="form-control"
          placeholder="Search by audience, plan, topic, or department…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search pathways"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted">No pathways found.</p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  {[
                    ["audience", "Audience"],
                    ["plan", "Plan"],
                    ["topic", "Topic"],
                    ["department", "Department"],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      scope="col"
                      aria-sort={
                        sortKey === key
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold text-dark"
                        onClick={() => handleSort(key)}
                      >
                        {label}{" "}
                        {sortKey === key ? (
                          <span aria-hidden="true">
                            {sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        ) : (
                          <span aria-hidden="true" className="text-muted">
                            ⇅
                          </span>
                        )}
                      </button>
                    </th>
                  ))}
                  <th scope="col">Status</th>
                  <th scope="col">Last Updated</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((pw) => (
                  <tr key={pw._id}>
                    <td>{pw.audience_id?.name ?? "—"}</td>
                    <td>{pw.plan_id?.name ?? "—"}</td>
                    <td>{pw.topic_id?.name ?? "—"}</td>
                    <td>{pw.department || "—"}</td>
                    <td>
                      <span
                        className={`badge ${
                          pw.status === "published"
                            ? "bg-success"
                            : "bg-secondary"
                        }`}
                      >
                        {pw.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      {pw.updatedAt
                        ? new Date(pw.updatedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          to={`/admin/pathways/${pw._id}/edit`}
                          className="btn btn-outline-secondary"
                        >
                          Edit
                        </Link>
                        {canModify && (
                          <>
                            {pw.status === "published" ? (
                              <button
                                className="btn btn-outline-dark"
                                onClick={() => handleUnpublish(pw)}
                              >
                                Unpublish
                              </button>
                            ) : (
                              <button
                                className="btn btn-outline-success"
                                onClick={() => handlePublish(pw)}
                              >
                                Publish
                              </button>
                            )}
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => setToDelete(pw)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={sorted.length}
              perPage={PER_PAGE}
            />
          </div>
        </>
      )}

      <ConfirmDialog
        show={!!toDelete}
        title="Delete Pathway"
        message={
          toDelete
            ? `Delete the pathway for ${
                toDelete.audience_id?.name ?? ""
              } / ${toDelete.plan_id?.name ?? ""} / ${
                toDelete.topic_id?.name ?? ""
              }? This cannot be undone.`
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
