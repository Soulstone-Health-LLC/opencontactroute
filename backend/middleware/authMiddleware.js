import passport from "passport";

const protect = passport.authenticate("jwt", { session: false });

export { protect };
