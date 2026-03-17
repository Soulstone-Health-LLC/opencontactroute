import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User from "../models/userModel.js";

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
