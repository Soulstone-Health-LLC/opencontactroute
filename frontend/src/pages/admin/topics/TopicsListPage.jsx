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
  getTopics,
  updateTopic,
  deleteTopic,
} from "../../../services/topicService";
import { toast } from "react-toastify";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import InfoTooltip from "../../../components/ui/InfoTooltip";
import Pagination from "../../../components/ui/Pagination";
import { useAuth } from "../../../hooks/useAuth";

const PER_PAGE = 20;

function SortableRow({ topic, canModify, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: topic._id });
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
      <td>{topic.name}</td>
      <td>
        <code>{topic.slug}</code>
      </td>
      <td>{topic.sort_order}</td>
      <td>
        <span
          className={`badge ${topic.is_active ? "bg-success" : "bg-secondary"}`}
        >
          {topic.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        {topic.updatedAt ? new Date(topic.updatedAt).toLocaleDateString() : "—"}
      </td>
      <td className="text-end">
        <div className="btn-group btn-group-sm">
          <Link
            to={`/admin/topics/${topic._id}/edit`}
            className="btn btn-outline-secondary"
          >
            Edit
          </Link>
          {canModify && (
            <>
              <button
                className={`btn btn-outline-${topic.is_active ? "dark" : "success"}`}
                onClick={() => onToggle(topic)}
              >
                {topic.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => onDelete(topic)}
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

function PlainRow({ topic, canModify, onToggle, onDelete }) {
  return (
    <tr>
      <td>{topic.name}</td>
      <td>
        <code>{topic.slug}</code>
      </td>
      <td>{topic.sort_order}</td>
      <td>
        <span
          className={`badge ${topic.is_active ? "bg-success" : "bg-secondary"}`}
        >
          {topic.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        {topic.updatedAt ? new Date(topic.updatedAt).toLocaleDateString() : "—"}
      </td>
      <td className="text-end">
        <div className="btn-group btn-group-sm">
          <Link
            to={`/admin/topics/${topic._id}/edit`}
            className="btn btn-outline-secondary"
          >
            Edit
          </Link>
          {canModify && (
            <>
              <button
                className={`btn btn-outline-${topic.is_active ? "dark" : "success"}`}
                onClick={() => onToggle(topic)}
              >
                {topic.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => onDelete(topic)}
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

export default function TopicsListPage() {
  const { user } = useAuth();
  const canModify =
    user?.user_role === "admin" || user?.user_role === "super user";

  const [topics, setTopics] = useState([]);
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
    getTopics()
      .then((res) => setTopics(res.data))
      .catch(() => setError("Failed to load topics."))
      .finally(() => setLoading(false));
  }, []);

  const isSearching = search.trim().length > 0;

  const filtered = topics.filter((t) => {
    if (!showInactive && !t.is_active) return false;
    if (!isSearching) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) || t.slug?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function handleToggle(topic) {
    setActionError(null);
    try {
      const res = await updateTopic(topic._id, {
        is_active: !topic.is_active,
      });
      setTopics((prev) =>
        prev.map((t) => (t._id === topic._id ? res.data : t)),
      );
      toast.success(
        res.data.is_active ? "Topic activated." : "Topic deactivated.",
      );
    } catch {
      setActionError("Failed to update topic.");
    }
  }

  async function handleDeleteConfirm() {
    setActionError(null);
    try {
      await deleteTopic(toDelete._id);
      setTopics((prev) => prev.filter((t) => t._id !== toDelete._id));
      toast.success("Topic deleted.");
    } catch {
      setActionError("Failed to delete topic.");
    } finally {
      setToDelete(null);
    }
  }

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIndex = topics.findIndex((t) => t._id === active.id);
    const newIndex = topics.findIndex((t) => t._id === over.id);
    const reordered = arrayMove(topics, oldIndex, newIndex).map((t, index) => ({
      ...t,
      sort_order: index,
    }));
    setTopics(reordered);
    try {
      await Promise.all(
        reordered.map((t, index) => updateTopic(t._id, { sort_order: index })),
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
        <h2 className="mb-0">Topics</h2>
        {canModify && (
          <Link to="/admin/topics/new" className="btn btn-primary btn-sm">
            + New Topic
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
          aria-label="Search topics"
        />
        <div className="form-check form-check-inline ms-1 mb-0 text-nowrap">
          <input
            id="show-inactive-topics"
            type="checkbox"
            className="form-check-input"
            checked={showInactive}
            onChange={(e) => {
              setShowInactive(e.target.checked);
              setPage(1);
            }}
          />
          <label
            htmlFor="show-inactive-topics"
            className="form-check-label small"
          >
            Show inactive
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted">No topics found.</p>
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
                        text="A URL-safe identifier auto-generated from the topic name. Used in the widget embed URL to target this topic."
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
                  {pageItems.map((topic) => (
                    <PlainRow
                      key={topic._id}
                      topic={topic}
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
                          text="A URL-safe identifier auto-generated from the topic name. Used in the widget embed URL to target this topic."
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
                    items={pageItems.map((t) => t._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody>
                      {pageItems.map((topic) => (
                        <SortableRow
                          key={topic._id}
                          topic={topic}
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
        title="Delete Topic"
        message={`Are you sure you want to delete "${toDelete?.name}"? This cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
