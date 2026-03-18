import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getAudiences,
  updateAudience,
  deleteAudience,
} from "../../../services/audienceService";
import { toast } from "react-toastify";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import Pagination from "../../../components/ui/Pagination";
import { useAuth } from "../../../hooks/useAuth";

const PER_PAGE = 20;

function SortableRow({ audience, canModify, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: audience._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style}>
      <td>
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: "grab", fontSize: "1.2rem", lineHeight: 1 }}
          aria-label="Drag to reorder"
        >
          ⠿
        </span>
      </td>
      <td>{audience.name}</td>
      <td>
        <code>{audience.slug}</code>
      </td>
      <td>{audience.sort_order}</td>
      <td>
        <span
          className={`badge ${audience.is_active ? "bg-success" : "bg-secondary"}`}
        >
          {audience.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        {audience.updatedAt
          ? new Date(audience.updatedAt).toLocaleDateString()
          : "—"}
      </td>
      <td className="text-end">
        <div className="btn-group btn-group-sm">
          <Link
            to={`/admin/audiences/${audience._id}/edit`}
            className="btn btn-outline-secondary"
          >
            Edit
          </Link>
          {canModify && (
            <>
              <button
                className={`btn btn-outline-${audience.is_active ? "dark" : "success"}`}
                onClick={() => onToggle(audience)}
              >
                {audience.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => onDelete(audience)}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function PlainRow({ audience, canModify, onToggle, onDelete }) {
  return (
    <tr>
      <td>{audience.name}</td>
      <td>
        <code>{audience.slug}</code>
      </td>
      <td>{audience.sort_order}</td>
      <td>
        <span
          className={`badge ${audience.is_active ? "bg-success" : "bg-secondary"}`}
        >
          {audience.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        {audience.updatedAt
          ? new Date(audience.updatedAt).toLocaleDateString()
          : "—"}
      </td>
      <td className="text-end">
        <div className="btn-group btn-group-sm">
          <Link
            to={`/admin/audiences/${audience._id}/edit`}
            className="btn btn-outline-secondary"
          >
            Edit
          </Link>
          {canModify && (
            <>
              <button
                className={`btn btn-outline-${audience.is_active ? "dark" : "success"}`}
                onClick={() => onToggle(audience)}
              >
                {audience.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => onDelete(audience)}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AudiencesListPage() {
  const { user } = useAuth();
  const canModify =
    user?.user_role === "admin" || user?.user_role === "super user";

  const [audiences, setAudiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    getAudiences()
      .then((res) => setAudiences(res.data))
      .catch(() => setError("Failed to load audiences."))
      .finally(() => setLoading(false));
  }, []);

  const isSearching = search.trim().length > 0;

  const filtered = audiences.filter((a) => {
    if (!showInactive && !a.is_active) return false;
    if (!isSearching) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) || a.slug?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function handleToggle(audience) {
    setActionError(null);
    try {
      const res = await updateAudience(audience._id, {
        is_active: !audience.is_active,
      });
      setAudiences((prev) =>
        prev.map((a) => (a._id === audience._id ? res.data : a)),
      );
      toast.success(
        res.data.is_active ? "Audience activated." : "Audience deactivated.",
      );
    } catch {
      setActionError("Failed to update audience.");
    }
  }

  async function handleDeleteConfirm() {
    setActionError(null);
    try {
      await deleteAudience(toDelete._id);
      setAudiences((prev) => prev.filter((a) => a._id !== toDelete._id));
      toast.success("Audience deleted.");
    } catch {
      setActionError("Failed to delete audience.");
    } finally {
      setToDelete(null);
    }
  }

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIndex = audiences.findIndex((a) => a._id === active.id);
    const newIndex = audiences.findIndex((a) => a._id === over.id);
    const reordered = arrayMove(audiences, oldIndex, newIndex).map(
      (a, index) => ({ ...a, sort_order: index }),
    );
    setAudiences(reordered);
    try {
      await Promise.all(
        reordered.map((a, index) =>
          updateAudience(a._id, { sort_order: index }),
        ),
      );
      toast.success("Sort order saved.");
    } catch {
      setActionError("Failed to save new sort order.");
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
        <h2 className="mb-0">Audiences</h2>
        {canModify && (
          <Link to="/admin/audiences/new" className="btn btn-primary btn-sm">
            + New Audience
          </Link>
        )}
      </div>

      {(error || actionError) && (
        <div className="alert alert-danger" role="alert">
          {error || actionError}
        </div>
      )}

      <div className="d-flex gap-2 align-items-center mb-3">
        <input
          type="search"
          className="form-control"
          placeholder="Search by name or slug…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search audiences"
        />
        <div className="form-check form-check-inline ms-1 mb-0 text-nowrap">
          <input
            id="show-inactive-audiences"
            type="checkbox"
            className="form-check-input"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked);
              setPage(1);
            }}
          />
          <label
            htmlFor="show-inactive-audiences"
            className="form-check-label small"
          >
            Show inactive
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted">No audiences found.</p>
      ) : (
        <>
          <div className="table-responsive">
            {isSearching ? (
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Slug</th>
                    <th scope="col">Sort</th>
                    <th scope="col">Status</th>
                    <th scope="col">Last Updated</th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((audience) => (
                    <PlainRow
                      key={audience._id}
                      audience={audience}
                      canModify={canModify}
                      onToggle={handleToggle}
                      onDelete={setToDelete}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col" style={{ width: "2rem" }}>
                        <span className="visually-hidden">Drag</span>
                      </th>
                      <th scope="col">Name</th>
                      <th scope="col">Slug</th>
                      <th scope="col">Sort</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last Updated</th>
                      <th scope="col">
                        <span className="visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={pageItems.map((a) => a._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody>
                      {pageItems.map((audience) => (
                        <SortableRow
                          key={audience._id}
                          audience={audience}
                          canModify={canModify}
                          onToggle={handleToggle}
                          onDelete={setToDelete}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            )}
          </div>

          <div className="mt-3">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filtered.length}
              perPage={PER_PAGE}
            />
          </div>
        </>
      )}

      <ConfirmDialog
        show={!!toDelete}
        title="Delete Audience"
        message={`Are you sure you want to delete "${toDelete?.name}"? This cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
