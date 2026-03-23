import passport from "passport";

// ─── PROTECT MIDDLEWARE ───────────────────────────────────────────────────────
// Verifies the JWT from the httpOnly cookie or Authorization: Bearer header.
// Populates req.user with the authenticated user document on success.
// Returns 401 if the token is missing, invalid, or expired.
// Apply to any route that requires authentication:
//   router.get("/profile", protect, handler)
const protect = passport.authenticate("jwt", { session: false });

export { protect };
