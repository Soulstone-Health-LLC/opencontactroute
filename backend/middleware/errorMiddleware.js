import logger from "../utils/logger.js";

// ─── NOT FOUND HANDLER ────────────────────────────────────────────────────────
// Catches any request that didn't match a registered route and forwards a
// 404 error to the error handler below.
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
// Centralised error handler for all thrown/forwarded errors.
// Normalises Mongoose CastError (bad ObjectId) → 404
// Normalises Mongoose ValidationError → 400
// Stack traces are omitted in production.
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  logger.error({
    message: err.message,
    statusCode,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export { notFound, errorHandler };
