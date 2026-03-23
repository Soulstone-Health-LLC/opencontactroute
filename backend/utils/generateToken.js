import jwt from "jsonwebtoken";

// ─── GENERATE TOKEN ───────────────────────────────────────────────────────────
// Signs a JWT and sets it as an httpOnly cookie on the response.
//
// Cookie flags:
//   httpOnly  — not accessible via document.cookie; protects against XSS
//   secure    — HTTPS-only in production; allows HTTP in development
//   sameSite  — strict; prevents the cookie being sent on cross-site requests

const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId, sub: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return token;
};

export default generateToken;
