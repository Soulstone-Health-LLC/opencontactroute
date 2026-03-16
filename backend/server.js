import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app.js";

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
  console.log(`Connected to MongoDB`);
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
