import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "passport";
import configurePassport from "./middleware/passportConfig.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import userRoutes from "./routes/userRoutes.js";
import personRoutes from "./routes/personRoutes.js";

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

// Routes - Users
app.use("/api/v1/users", userRoutes);
// Routes - Persons
app.use("/api/v1/persons", personRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
