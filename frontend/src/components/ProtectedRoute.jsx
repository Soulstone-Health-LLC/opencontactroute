import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// ─── PROTECTED ROUTE ─────────────────────────────────────────────────────────
// Wraps routes that require authentication.
// Redirects to /login if there is no authenticated user.
// Optionally, pass requiredRole="admin" to restrict a route to a single role —
// users with a different role are redirected to /admin instead of getting an error.
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.user_role !== requiredRole)
    return <Navigate to="/admin" replace />;

  return children;
}
