import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../../hooks/useAuth";
import {
  getPersonProfile,
  updatePersonProfile,
  createPerson,
} from "../../../services/personService";

const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "V", "MD", "PhD", "Esq."];

const ROLE_LABELS = {
  admin: "Admin",
  "super user": "Super User",
  user: "User",
};

const EMPTY_FORM = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
};

export default function ProfilePage() {
  const { user } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPersonProfile()
      .then((res) => {
        const p = res.data;
        setForm({
          first_name: p.first_name ?? "",
          middle_name: p.middle_name ?? "",
          last_name: p.last_name ?? "",
          suffix: p.suffix ?? "",
        });
        setHasProfile(true);
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          // No profile exists yet — show empty creation form
          setHasProfile(false);
        } else {
          setLoadError("Failed to load profile.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleField(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        ...(form.middle_name ? { middle_name: form.middle_name } : {}),
        ...(form.suffix ? { suffix: form.suffix } : {}),
      };

      if (hasProfile) {
        await updatePersonProfile(payload);
      } else {
        await createPerson({ user_id: user._id, ...payload });
        setHasProfile(true);
      }
      toast.success("Profile saved.");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-4">My Profile</h2>

      {/* ── Account Info (read-only) ─────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">Account</div>
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-3 text-muted">Email</dt>
            <dd className="col-sm-9">{user?.email ?? "—"}</dd>
            <dt className="col-sm-3 text-muted">Role</dt>
            <dd className="col-sm-9 mb-0">
              {ROLE_LABELS[user?.user_role] ?? user?.user_role ?? "—"}
            </dd>
          </dl>
        </div>
      </div>

      {/* ── Personal Information ─────────────────────────────────────── */}
      <div className="card">
        <div className="card-header fw-semibold">Personal Information</div>
        <div className="card-body">
          {loadError && (
            <div className="alert alert-danger" role="alert">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="placeholder-glow" aria-busy="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-3">
                  <span className="placeholder col-3 mb-1 d-block" />
                  <span
                    className="placeholder col-8 d-block"
                    style={{ height: 38 }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSave} noValidate>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label" htmlFor="first-name">
                    First Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    className="form-control"
                    value={form.first_name}
                    onChange={handleField("first_name")}
                    required
                    maxLength={50}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label" htmlFor="middle-name">
                    Middle Name
                  </label>
                  <input
                    id="middle-name"
                    type="text"
                    className="form-control"
                    value={form.middle_name}
                    onChange={handleField("middle_name")}
                    maxLength={50}
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label" htmlFor="last-name">
                    Last Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    className="form-control"
                    value={form.last_name}
                    onChange={handleField("last_name")}
                    required
                    maxLength={50}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label" htmlFor="suffix">
                    Suffix
                  </label>
                  <select
                    id="suffix"
                    className="form-select"
                    value={form.suffix}
                    onChange={handleField("suffix")}
                  >
                    <option value="">— None —</option>
                    {SUFFIXES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Profile"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
