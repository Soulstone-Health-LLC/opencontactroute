// ─── REQUIRE ROLE MIDDLEWARE ──────────────────────────────────────────────────
// @desc    Restricts a route to users with one of the specified roles.
//          Must be used after the `protect` middleware so req.user is populated.
// @usage   router.delete("/:id", protect, requireRole("admin", "super user"), handler)
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.user_role)) {
      res.status(403);
      return next(new Error("Forbidden: insufficient permissions"));
    }
    next();
  };
