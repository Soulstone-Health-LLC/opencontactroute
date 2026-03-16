import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app.js";
import logger from "./utils/logger.js";

dotenv.config({ path: "./.env" });

// Get environment variables
const { MONGO_HOST, MONGO_USERNAME, MONGO_PASSWORD, MONGO_DATABASE } =
  process.env;

// MongoDB connection string
const MONGO_URI = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}/${MONGO_DATABASE}?authSource=admin`;

// Connect to MongoDB, then start server
const PORT = process.env.PORT || 3001;
try {
  await mongoose.connect(MONGO_URI);
  logger.info("Connected to MongoDB");
  app.listen(PORT, () => {
    logger.info({
      message: "Server started",
      port: PORT,
      env: process.env.NODE_ENV,
    });
  });
} catch (error) {
  logger.error({ message: "Failed to start server", error: error.message });
  process.exit(1);
}
