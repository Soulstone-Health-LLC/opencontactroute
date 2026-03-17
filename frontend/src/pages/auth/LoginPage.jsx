import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const res = await login(form);
      setUser(res.data);
      navigate("/admin");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your email and password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 p-0">
      <div className="row g-0 min-vh-100">
        {/* Left column — branding / future logo area */}
        <div
          className="col-12 col-md-6 d-flex align-items-center justify-content-center bg-primary"
          aria-hidden="true"
        >
          <div className="text-white text-center p-5">
            <h1 className="display-5 fw-bold">OpenContactRoute</h1>
            <p className="lead mt-3">
              Guided contact routing for health plans.
            </p>
          </div>
        </div>

        {/* Right column — login form */}
        <div className="col-12 col-md-6 d-flex align-items-center justify-content-center bg-white">
          <div
            className="w-100 px-4 px-sm-5 text-start"
            style={{ maxWidth: 480 }}
          >
            <h2 className="mb-1">Log in</h2>
            <p className="mb-4">Enter your credentials to continue.</p>

            {error && (
              <div
                className="alert alert-danger"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label htmlFor="email" className="form-label fw-semibold">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-control form-control-lg"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  required
                  aria-required="true"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="form-label fw-semibold">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-control form-control-lg"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  autoComplete="current-password"
                  required
                  aria-required="true"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-100"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Logging in\u2026" : "Log in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
