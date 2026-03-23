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
  getPlans,
  updatePlan,
  deletePlan,
} from "../../../services/planService";
import { toast } from "react-toastify";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import InfoTooltip from "../../../components/ui/InfoTooltip";
import Pagination from "../../../components/ui/Pagination";
import { useAuth } from "../../../hooks/useAuth";

const PER_PAGE = 20;

function SortableRow({ plan, canModify, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: plan._id });
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
      <td>{plan.name}</td>
      <td>
        <code>{plan.slug}</code>
      </td>
      <td>{plan.sort_order}</td>
      <td>
        <span
          className={`badge ${plan.is_active ? "bg-success" : "bg-secondary"}`}
        >
          {plan.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        {plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString() : "—"}
      </td>
      <td className="text-end">
        <div className="btn-group btn-group-sm">
          <Link
            to={`/admin/plans/${plan._id}/edit`}
            className="btn btn-outline-secondary"
          >
            Edit
          </Link>
          {canModify && (
            <>
              <button
                className={`btn btn-outline-${plan.is_active ? "dark" : "success"}`}
                onClick={() => onToggle(plan)}
              >
                {plan.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => onDelete(plan)}
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

function PlainRow({ plan, canModify, onToggle, onDelete }) {
  return (
    <tr>
      <td>{plan.name}</td>
      <td>
        <code>{plan.slug}</code>
      </td>
      <td>{plan.sort_order}</td>
      <td>
        <span
          className={`badge ${plan.is_active ? "bg-success" : "bg-secondary"}`}
        >
          {plan.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        {plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString() : "—"}
      </td>
      <td className="text-end">
        <div className="btn-group btn-group-sm">
          <Link
            to={`/admin/plans/${plan._id}/edit`}
            className="btn btn-outline-secondary"
          >
            Edit
          </Link>
          {canModify && (
            <>
              <button
                className={`btn btn-outline-${plan.is_active ? "dark" : "success"}`}
                onClick={() => onToggle(plan)}
              >
                {plan.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => onDelete(plan)}
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

export default function PlansListPage() {
  const { user } = useAuth();
  const canModify =
    user?.user_role === "admin" || user?.user_role === "super user";

  const [plans, setPlans] = useState([]);
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
    getPlans()
      .then((res) => setPlans(res.data))
      .catch(() => setError("Failed to load plans."))
      .finally(() => setLoading(false));
  }, []);

  const isSearching = search.trim().length > 0;

  const filtered = plans.filter((p) => {
    if (!showInactive && !p.is_active) return false;
    if (!isSearching) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function handleToggle(plan) {
    setActionError(null);
    try {
      const res = await updatePlan(plan._id, {
        is_active: !plan.is_active,
      });
      setPlans((prev) => prev.map((p) => (p._id === plan._id ? res.data : p)));
      toast.success(
        res.data.is_active ? "Plan activated." : "Plan deactivated.",
      );
    } catch {
      setActionError("Failed to update plan.");
    }
  }

  async function handleDeleteConfirm() {
    setActionError(null);
    try {
      await deletePlan(toDelete._id);
      setPlans((prev) => prev.filter((p) => p._id !== toDelete._id));
      toast.success("Plan deleted.");
    } catch {
      setActionError("Failed to delete plan.");
    } finally {
      setToDelete(null);
    }
  }

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIndex = plans.findIndex((p) => p._id === active.id);
    const newIndex = plans.findIndex((p) => p._id === over.id);
    const reordered = arrayMove(plans, oldIndex, newIndex).map((p, index) => ({
      ...p,
      sort_order: index,
    }));
    setPlans(reordered);
    try {
      await Promise.all(
        reordered.map((p, index) => updatePlan(p._id, { sort_order: index })),
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
        <h2 className="mb-0">Plans</h2>
        {canModify && (
          <Link to="/admin/plans/new" className="btn btn-primary btn-sm">
            + New Plan
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
          aria-label="Search plans"
        />
        <div className="form-check form-check-inline ms-1 mb-0 text-nowrap">
          <input
            id="show-inactive-plans"
            type="checkbox"
            className="form-check-input"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked);
              setPage(1);
            }}
          />
          <label
            htmlFor="show-inactive-plans"
            className="form-check-label small"
          >
            Show inactive
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted">No plans found.</p>
      ) : (
        <>
          <div className="table-responsive">
            {isSearching ? (
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">
                      Slug{" "}
                      <InfoTooltip
                        text="A URL-safe identifier auto-generated from the plan name. Used in the widget embed URL to target this plan."
                        placement="top"
                      />
                    </th>
                    <th scope="col">
                      Sort{" "}
                      <InfoTooltip
                        text="Controls the display order in the widget. Drag any row to reorder — changes are saved automatically."
                        placement="top"
                      />
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col">Last Updated</th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((plan) => (
                    <PlainRow
                      key={plan._id}
                      plan={plan}
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
                      <th scope="col">
                        Slug{" "}
                        <InfoTooltip
                          text="A URL-safe identifier auto-generated from the plan name. Used in the widget embed URL to target this plan."
                          placement="top"
                        />
                      </th>
                      <th scope="col">
                        Sort{" "}
                        <InfoTooltip
                          text="Controls the display order in the widget. Drag any row to reorder — changes are saved automatically."
                          placement="top"
                        />
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col">Last Updated</th>
                      <th scope="col">
                        <span className="visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={pageItems.map((p) => p._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody>
                      {pageItems.map((plan) => (
                        <SortableRow
                          key={plan._id}
                          plan={plan}
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
        title="Delete Plan"
        message={`Are you sure you want to delete "${toDelete?.name}"? This cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
