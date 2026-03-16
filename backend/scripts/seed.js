/**
 * Seed script — populates the database with representative demo data.
 *
 * Usage (from the backend/ directory):
 *   node scripts/seed.js
 *
 * Requires a running MongoDB instance and a valid .env file at backend/.env.
 * Safe to re-run: existing records are left unchanged; only missing ones are
 * created (upsert semantics where possible, otherwise skip-if-exists).
 *
 * Records created:
 *   - 1 admin user  (credentials from ADMIN_EMAIL / ADMIN_PASSWORD env vars)
 *   - 3 audiences
 *   - 3 plans
 *   - 3 topics
 *   - 9 contact pathways (one per audience × plan × topic combination, all published)
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import logger from "../utils/logger.js";
import User from "../models/userModel.js";
import Person from "../models/personModel.js";
import Audience from "../models/audienceModel.js";
import Plan from "../models/planModel.js";
import Topic from "../models/topicModel.js";
import ContactPathway from "../models/contactPathwayModel.js";

dotenv.config({ path: "./.env" });

const {
  MONGO_HOST,
  MONGO_USERNAME,
  MONGO_PASSWORD,
  MONGO_DATABASE,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_FIRST_NAME = "Admin",
  ADMIN_LAST_NAME = "User",
} = process.env;

if (!MONGO_HOST || !MONGO_USERNAME || !MONGO_PASSWORD || !MONGO_DATABASE) {
  logger.error(
    "Missing required MongoDB environment variables. Check your .env file.",
  );
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  logger.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD. Check your .env file.");
  process.exit(1);
}

const MONGO_URI = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}/${MONGO_DATABASE}?authSource=admin`;

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const AUDIENCES = [
  { name: "Medicare Member", sort_order: 1, is_active: true },
  { name: "Medicaid Member", sort_order: 2, is_active: true },
  { name: "Commercial Member", sort_order: 3, is_active: true },
];

const PLANS = [
  { name: "HMO", sort_order: 1, is_active: true },
  { name: "PPO", sort_order: 2, is_active: true },
  { name: "EPO", sort_order: 3, is_active: true },
];

const TOPICS = [
  { name: "Benefits & Coverage", sort_order: 1, is_active: true },
  { name: "Claims & Billing", sort_order: 2, is_active: true },
  { name: "Prior Authorization", sort_order: 3, is_active: true },
];

// Pathway contact details indexed by [audienceIndex][planIndex][topicIndex]
const PATHWAY_DETAILS = [
  // Medicare Members
  [
    // HMO
    [
      { department: "Medicare HMO Benefits", phone: "1-800-555-0101" },
      { department: "Medicare HMO Claims", phone: "1-800-555-0102" },
      { department: "Medicare HMO Auth", phone: "1-800-555-0103" },
    ],
    // PPO
    [
      { department: "Medicare PPO Benefits", phone: "1-800-555-0111" },
      { department: "Medicare PPO Claims", phone: "1-800-555-0112" },
      { department: "Medicare PPO Auth", phone: "1-800-555-0113" },
    ],
    // EPO
    [
      { department: "Medicare EPO Benefits", phone: "1-800-555-0121" },
      { department: "Medicare EPO Claims", phone: "1-800-555-0122" },
      { department: "Medicare EPO Auth", phone: "1-800-555-0123" },
    ],
  ],
  // Medicaid Members
  [
    [
      { department: "Medicaid HMO Benefits", phone: "1-800-555-0201" },
      { department: "Medicaid HMO Claims", phone: "1-800-555-0202" },
      { department: "Medicaid HMO Auth", phone: "1-800-555-0203" },
    ],
    [
      { department: "Medicaid PPO Benefits", phone: "1-800-555-0211" },
      { department: "Medicaid PPO Claims", phone: "1-800-555-0212" },
      { department: "Medicaid PPO Auth", phone: "1-800-555-0213" },
    ],
    [
      { department: "Medicaid EPO Benefits", phone: "1-800-555-0221" },
      { department: "Medicaid EPO Claims", phone: "1-800-555-0222" },
      { department: "Medicaid EPO Auth", phone: "1-800-555-0223" },
    ],
  ],
  // Commercial Members
  [
    [
      { department: "Commercial HMO Benefits", phone: "1-800-555-0301" },
      { department: "Commercial HMO Claims", phone: "1-800-555-0302" },
      { department: "Commercial HMO Auth", phone: "1-800-555-0303" },
    ],
    [
      { department: "Commercial PPO Benefits", phone: "1-800-555-0311" },
      { department: "Commercial PPO Claims", phone: "1-800-555-0312" },
      { department: "Commercial PPO Auth", phone: "1-800-555-0313" },
    ],
    [
      { department: "Commercial EPO Benefits", phone: "1-800-555-0321" },
      { department: "Commercial EPO Claims", phone: "1-800-555-0322" },
      { department: "Commercial EPO Auth", phone: "1-800-555-0323" },
    ],
  ],
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function upsertByName(Model, records) {
  const results = [];
  for (const data of records) {
    let doc = await Model.findOne({ name: data.name });
    if (!doc) {
      doc = await Model.create(data);
      logger.info({
        message: "Created",
        model: Model.modelName,
        name: data.name,
      });
    } else {
      logger.info({
        message: "Already exists, skipping",
        model: Model.modelName,
        name: data.name,
      });
    }
    results.push(doc);
  }
  return results;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO_URI);
  logger.info("Connected to MongoDB");

  // ── Admin user ─────────────────────────────────────────────────────────────
  let adminUser = await User.findOne({ email: ADMIN_EMAIL });
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    adminUser = await User.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      user_role: "admin",
    });
    await Person.create({
      user_id: adminUser._id,
      first_name: ADMIN_FIRST_NAME,
      last_name: ADMIN_LAST_NAME,
    });
    logger.info({ message: "Created admin user", email: ADMIN_EMAIL });
  } else {
    logger.info({
      message: "Admin user already exists, skipping",
      email: ADMIN_EMAIL,
    });
  }

  // ── Reference data ─────────────────────────────────────────────────────────
  const audiences = await upsertByName(Audience, AUDIENCES);
  const plans = await upsertByName(Plan, PLANS);
  const topics = await upsertByName(Topic, TOPICS);

  // ── Contact pathways (full cartesian product, all published) ───────────────
  let created = 0;
  let skipped = 0;

  for (let ai = 0; ai < audiences.length; ai++) {
    for (let pi = 0; pi < plans.length; pi++) {
      for (let ti = 0; ti < topics.length; ti++) {
        const existing = await ContactPathway.findOne({
          audience_id: audiences[ai]._id,
          plan_id: plans[pi]._id,
          topic_id: topics[ti]._id,
        });

        if (existing) {
          skipped++;
          continue;
        }

        const { department, phone } = PATHWAY_DETAILS[ai][pi][ti];
        const pathway = await ContactPathway.create({
          audience_id: audiences[ai]._id,
          plan_id: plans[pi]._id,
          topic_id: topics[ti]._id,
          department,
          phone,
          updated_by: adminUser._id,
        });

        // Publish it
        pathway.status = "published";
        pathway.published_at = new Date();
        await pathway.save();
        created++;
      }
    }
  }

  logger.info({ message: "Pathway seeding complete", created, skipped });
  logger.info("Seed complete");
}

seed()
  .then(() => {
    mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ message: "Seed failed", error: err.message });
    mongoose.disconnect();
    process.exit(1);
  });
