import { createContext, useState, useEffect } from "react";
import { getProfile } from "../services/authService";

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
// Manages the authenticated user for the entire app.
// On mount, attempts to load the current user from the JWT cookie via GET /profile.
// If the cookie is absent or invalid, user is set to null.
//
// Values exposed:
//   user     — the authenticated user object, or null if not logged in
//   setUser  — used by LoginPage/LogoutPage to update auth state without a reload
//   loading  — true while the initial profile fetch is in flight; used by
//              ProtectedRoute to avoid a flash-redirect before auth is known

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
