import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getUser,
  createUser,
  updateUser,
  adminChangePassword,
} from "../../../services/userService";
import {
  getPersonByUser,
  createPerson,
  updatePerson,
} from "../../../services/personService";

const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "V", "MD", "PhD", "Esq."];

const ROLES = [
  { value: "user", label: "User" },
  { value: "super user", label: "Super User" },
  { value: "admin", label: "Admin" },
];

export default function UserFormPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    user_role: "user",
  });
  const [personForm, setPersonForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
  });
  const [existingPersonId, setExistingPersonId] = useState(null);

  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pwForm, setPwForm] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [pwError, setPwError] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    Promise.all([
      getUser(id),
      getPersonByUser(id).catch((err) => {
        if (err?.response?.status === 404) return null;
        throw err;
      }),
    ])
      .then(([userRes, personRes]) => {
        const u = userRes.data;
        setUserForm({
          email: u.email ?? "",
          password: "",
          user_role: u.user_role ?? "user",
        });
        if (personRes) {
          const p = personRes.data;
          setPersonForm({
            first_name: p.first_name ?? "",
            middle_name: p.middle_name ?? "",
            last_name: p.last_name ?? "",
            suffix: p.suffix ?? "",
          });
          setExistingPersonId(p._id);
        }
      })
      .catch(() => setLoadError("Failed to load user."))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  function handleUserField(field) {
    return (e) => setUserForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handlePersonField(field) {
    return (e) =>
      setPersonForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handlePwField(field) {
    return (e) => setPwForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError(null);
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      await adminChangePassword(id, { new_password: pwForm.new_password });
      setPwForm({ new_password: "", confirm_password: "" });
      toast.success("Password changed successfully.");
    } catch (err) {
      setPwError(err?.response?.data?.message ?? "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  }

  function validate() {
    const errors = {};
    if (!userForm.email.trim()) errors.email = "Email is required.";
    if (!isEditing && !userForm.password)
      errors.password = "Password is required.";
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      let userId = id;

      if (!isEditing) {
        const res = await createUser({
          email: userForm.email.trim(),
          password: userForm.password,
          user_role: userForm.user_role,
        });
        userId = res.data._id;
      } else {
        await updateUser(id, {
          email: userForm.email.trim(),
          user_role: userForm.user_role,
        });
      }

      const personPayload = {
        first_name: personForm.first_name.trim(),
        middle_name: personForm.middle_name.trim(),
        last_name: personForm.last_name.trim(),
        ...(personForm.suffix ? { suffix: personForm.suffix } : {}),
      };

      if (existingPersonId) {
        await updatePerson(existingPersonId, personPayload);
      } else {
        await createPerson({ user_id: userId, ...personPayload });
      }

      toast.success(isEditing ? "User saved." : "User created.");
      navigate("/admin/users");
    } catch (err) {
      setSaveError(err?.response?.data?.message ?? "Failed to save user.");
    } finally {
      setIsSubmitting(false);
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

  if (loadError) {
    return (
      <div className="alert alert-danger" role="alert">
        {loadError}
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">{isEditing ? "Edit User" : "New User"}</h2>
        <Link to="/admin/users" className="btn btn-outline-secondary">
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {saveError && (
          <div className="alert alert-danger" role="alert">
            {saveError}
          </div>
        )}

        {/* ── Account ─────────────────────────────────────────────────── */}
        <div className="card mb-4">
          <div className="card-header">
            <strong>Account</strong>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                value={userForm.email}
                onChange={handleUserField("email")}
                autoComplete="off"
              />
              {fieldErrors.email && (
                <div className="invalid-feedback">{fieldErrors.email}</div>
              )}
            </div>

            {!isEditing && (
              <div className="mb-3">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                  value={userForm.password}
                  onChange={handleUserField("password")}
                  autoComplete="new-password"
                />
                {fieldErrors.password && (
                  <div className="invalid-feedback">{fieldErrors.password}</div>
                )}
              </div>
            )}

            <div className="mb-3">
              <label htmlFor="user_role" className="form-label">
                Role
              </label>
              <select
                id="user_role"
                className="form-select"
                value={userForm.user_role}
                onChange={handleUserField("user_role")}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Person Profile ───────────────────────────────────────────── */}
        <div className="card mb-4">
          <div className="card-header">
            <strong>Person Profile</strong>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label htmlFor="first_name" className="form-label">
                  First Name
                </label>
                <input
                  id="first_name"
                  type="text"
                  className="form-control"
                  value={personForm.first_name}
                  onChange={handlePersonField("first_name")}
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="middle_name" className="form-label">
                  Middle Name
                </label>
                <input
                  id="middle_name"
                  type="text"
                  className="form-control"
                  value={personForm.middle_name}
                  onChange={handlePersonField("middle_name")}
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="last_name" className="form-label">
                  Last Name
                </label>
                <input
                  id="last_name"
                  type="text"
                  className="form-control"
                  value={personForm.last_name}
                  onChange={handlePersonField("last_name")}
                />
              </div>
              <div className="col-md-4">
                <label htmlFor="suffix" className="form-label">
                  Suffix
                </label>
                <select
                  id="suffix"
                  className="form-select"
                  value={personForm.suffix}
                  onChange={handlePersonField("suffix")}
                >
                  <option value="">None</option>
                  {SUFFIXES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : isEditing ? "Save User" : "Create User"}
          </button>
          <Link to="/admin/users" className="btn btn-outline-secondary">
            Cancel
          </Link>
        </div>
      </form>

      {/* ── Change Password (edit mode only) ─────────────────────────── */}
      {isEditing && (
        <form onSubmit={handleChangePassword} noValidate className="mt-4">
          <div className="card">
            <div className="card-header">
              <strong>Change Password</strong>
            </div>
            <div className="card-body">
              {pwError && (
                <div className="alert alert-danger" role="alert">
                  {pwError}
                </div>
              )}
              <div className="mb-3">
                <label htmlFor="new_password" className="form-label">
                  New Password
                </label>
                <input
                  id="new_password"
                  type="password"
                  className="form-control"
                  value={pwForm.new_password}
                  onChange={handlePwField("new_password")}
                  autoComplete="new-password"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="confirm_password" className="form-label">
                  Confirm New Password
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  className="form-control"
                  value={pwForm.confirm_password}
                  onChange={handlePwField("confirm_password")}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                className="btn btn-warning"
                disabled={pwSaving}
              >
                {pwSaving ? "Saving…" : "Set Password"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
