import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import mongoose from "mongoose";
import configurePassport from "./middleware/passportConfig.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import logger from "./utils/logger.js";
import userRoutes from "./routes/userRoutes.js";
import personRoutes from "./routes/personRoutes.js";
import audienceRoutes from "./routes/audienceRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import topicRoutes from "./routes/topicRoutes.js";
import contactPathwayRoutes from "./routes/contactPathwayRoutes.js";
import widgetRoutes from "./routes/widgetRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

const app = express();

configurePassport(passport);

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// HTTP request logging
app.use((req, _res, next) => {
  logger.info({
    message: "incoming request",
    method: req.method,
    url: req.originalUrl,
  });
  next();
});

// Health check (unauthenticated, used by Docker and monitoring)
app.get("/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected; anything else is not fully ready
  const dbOk = dbState === 1;

  const checks = {
    db: dbOk ? "ok" : "error",
  };

  const allOk = Object.values(checks).every((v) => v === "ok");
  const status = allOk ? "ok" : "error";
  const httpStatus = allOk ? 200 : 503;

  res.status(httpStatus).json({
    status,
    uptime: Math.floor(process.uptime()),
    checks,
  });
});

// Routes - Users
app.use("/api/v1/users", userRoutes);
// Routes - Persons
app.use("/api/v1/persons", personRoutes);
// Routes - Audiences
app.use("/api/v1/audiences", audienceRoutes);
// Routes - Plans
app.use("/api/v1/plans", planRoutes);
// Routes - Topics
app.use("/api/v1/topics", topicRoutes);
// Routes - Contact Pathways
app.use("/api/v1/pathways", contactPathwayRoutes);
// Routes - Widget (public)
app.use("/api/v1/widget", widgetRoutes);
// Routes - Reports
app.use("/api/v1/reports", reportRoutes);
// Routes - Settings
app.use("/api/v1/settings", settingsRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
