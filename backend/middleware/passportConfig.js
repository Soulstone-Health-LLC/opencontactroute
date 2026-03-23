import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User from "../models/userModel.js";

// ─── PASSPORT JWT CONFIGURATION ───────────────────────────────────────────────
// Configures the JWT strategy used by the `protect` middleware.
//
// Token extraction order:
//   1. httpOnly cookie named "jwt" — used by the browser-based admin interface
//   2. Authorization: Bearer header — used by direct API consumers
//
// password_hash is stripped from the populated user so it never appears on req.user.

const cookieExtractor = (req) => req?.cookies?.jwt ?? null;

const opts = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    cookieExtractor,
    ExtractJwt.fromAuthHeaderAsBearerToken(),
  ]),
  secretOrKey: process.env.JWT_SECRET,
};

export default (passport) => {
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      try {
        const user = await User.findById(jwt_payload.id).select(
          "-password_hash",
        );
        return user ? done(null, user) : done(null, false);
      } catch (error) {
        return done(error, false);
      }
    }),
  );
};
