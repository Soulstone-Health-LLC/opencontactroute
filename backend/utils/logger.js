import { createLogger, format, transports } from "winston";

const { combine, timestamp, json, errors, colorize, simple } = format;

const isDev = process.env.NODE_ENV !== "production";

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: isDev
    ? combine(errors({ stack: true }), colorize(), simple())
    : combine(errors({ stack: false }), timestamp(), json()),
  transports: [new transports.Console()],
  exitOnError: false,
});

export default logger;
