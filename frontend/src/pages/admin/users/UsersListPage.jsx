import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getUsers,
  activateUser,
  deactivateUser,
} from "../../../services/userService";
import { getPersons } from "../../../services/personService";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import InfoTooltip from "../../../components/ui/InfoTooltip";
import Pagination from "../../../components/ui/Pagination";

const PER_PAGE = 20;

const ROLE_LABELS = {
  admin: "Admin",
  "super user": "Super User",
  user: "User",
};

const ROLE_BADGE = {
  admin: "bg-danger",
  "super user": "bg-warning text-dark",
  user: "bg-secondary",
};

export default function UsersListPage() {
  const [users, setUsers] = useState([]);
  const [personsByUserId, setPersonsByUserId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [page, setPage] = useState(1);
  const [confirmItem, setConfirmItem] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [usersRes, personsRes] = await Promise.all([
        getUsers(),
        getPersons(),
      ]);
      setUsers(usersRes.data);
      const map = {};
      personsRes.data.forEach((p) => {
        const uid = p.user_id?._id ?? p.user_id;
        if (uid) map[String(uid)] = p;
      });
      setPersonsByUserId(map);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getDisplayName(user) {
    const p = personsByUserId[String(user._id)];
    if (!p) return "—";
    return [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
  }

  async function handleToggleConfirm() {
    const { user, action } = confirmItem;
    setConfirmItem(null);
    setActionError(null);
    try {
      const fn = action === "activate" ? activateUser : deactivateUser;
      const res = await fn(user._id);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, is_active: res.data.is_active } : u,
        ),
      );
      toast.success(
        `User ${action === "activate" ? "activated" : "deactivated"}.`,
      );
    } catch (err) {
      setActionError(
        err?.response?.data?.message ?? `Failed to ${action} user.`,
      );
    }
  }

  const totalPages = Math.ceil(users.length / PER_PAGE);
  const paged = users.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Users</h2>
        <Link to="/admin/users/new" className="btn btn-primary">
          New User
        </Link>
      </div>

      {actionError && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {actionError}
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setActionError(null)}
          />
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>
                  Role{" "}
                  <InfoTooltip
                    text="User: read-only access. Super User: can create and edit content. Admin: full access including user management and system settings."
                    placement="top"
                  />
                </th>
                <th>
                  Status{" "}
                  <InfoTooltip
                    text="Active users can log in. Inactive users are locked out and cannot access the admin."
                    placement="top"
                  />
                </th>
                <th>Last Updated</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No users found.
                  </td>
                </tr>
              ) : (
                paged.map((u) => (
                  <tr key={u._id}>
                    <td>{getDisplayName(u)}</td>
                    <td>{u.email}</td>
                    <td>
                      <span
                        className={`badge ${ROLE_BADGE[u.user_role] ?? "bg-secondary"}`}
                      >
                        {ROLE_LABELS[u.user_role] ?? u.user_role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${u.is_active ? "bg-success" : "bg-secondary"}`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {u.updatedAt
                        ? new Date(u.updatedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <Link
                          to={`/admin/users/${u._id}/edit`}
                          className="btn btn-outline-secondary"
                        >
                          Edit
                        </Link>
                        <button
                          className={`btn btn-outline-${u.is_active ? "dark" : "success"}`}
                          onClick={() =>
                            setConfirmItem({
                              user: u,
                              action: u.is_active ? "deactivate" : "activate",
                            })
                          }
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={users.length}
        perPage={PER_PAGE}
      />

      <ConfirmDialog
        show={!!confirmItem}
        title={
          confirmItem?.action === "activate"
            ? "Activate User"
            : "Deactivate User"
        }
        message={
          confirmItem?.action === "activate"
            ? `Activate ${confirmItem?.user?.email}?`
            : `Deactivate ${confirmItem?.user?.email}? They will no longer be able to log in.`
        }
        onConfirm={handleToggleConfirm}
        onCancel={() => setConfirmItem(null)}
      />
    </div>
  );
}
