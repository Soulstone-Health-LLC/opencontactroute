/**
 * Seed script — populates the database with representative demo data.
 *
 * ⚠️  SECURITY WARNING ⚠️
 * This script creates demo accounts with publicly documented credentials:
 *   - superuser@example.com / SuperUser!Demo1
 *   - member@example.com   / Member!Demo1234
 *
 * These credentials are well-known. DO NOT run this script against any
 * public-facing instance without removing or changing these accounts
 * immediately afterward. Use `make prod-seed` only for initial setup on
 * a trusted, network-restricted host.
 *
 * Usage (from the backend/ directory):
 *   node scripts/seed.js
 *
 * Requires a running MongoDB instance and a valid .env file at backend/.env.
 * Safe to re-run: existing records are left unchanged; only missing ones are
 * created (upsert semantics where possible, otherwise skip-if-exists).
 *
 * Records created:
 *   Users:
 *     - 1 admin        (ADMIN_EMAIL / ADMIN_PASSWORD env vars)
 *     - 1 super user   (superuser@example.com / SuperUser!Demo1)  ⚠️ known creds
 *     - 1 regular user (member@example.com   / Member!Demo1234)   ⚠️ known creds
 *
 *   Reference data:
 *     - 4 audiences  (3 active, 1 inactive — tests widget active-only filter)
 *     - 4 plans      (3 active, 1 inactive)
 *     - 4 topics     (3 active, 1 inactive)
 *
 *   Pathways (from 27 active A×P×T combinations):
 *     - 20 published  (including 1 delegated-vendor pathway)
 *     - 4  draft      (Commercial PPO + all topics; Commercial HMO + Auth)
 *     - 3  uncovered  (Commercial EPO — not created)
 *     Tests: content-audit filters, pathway-coverage counts, widget routing
 *
 *   PathwayEvents (~155 events spread over the last 30 days):
 *     Distributed unevenly across pathways/audiences/plans/topics so that
 *     report rankings (top-pathways, top-topics, etc.) return meaningful data.
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
import PathwayEvent from "../models/pathwayEventModel.js";

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

// 3 active + 1 inactive — tests that widget returns only active records
const AUDIENCES = [
  { name: "Medicare Member", sort_order: 1, is_active: true },
  { name: "Medicaid Member", sort_order: 2, is_active: true },
  { name: "Commercial Member", sort_order: 3, is_active: true },
  { name: "Retired Employee", sort_order: 4, is_active: false },
];

const PLANS = [
  { name: "HMO", sort_order: 1, is_active: true },
  { name: "PPO", sort_order: 2, is_active: true },
  { name: "EPO", sort_order: 3, is_active: true },
  { name: "HDHP", sort_order: 4, is_active: false },
];

const TOPICS = [
  { name: "Benefits & Coverage", sort_order: 1, is_active: true },
  { name: "Claims & Billing", sort_order: 2, is_active: true },
  { name: "Prior Authorization", sort_order: 3, is_active: true },
  { name: "Prescription Drug", sort_order: 4, is_active: false },
];

/**
 * Pathway definitions for the 3 active audiences × 3 active plans × 3 active topics.
 *
 * status: "published" | "draft" | null (null = do not create → uncovered)
 *
 * Coverage breakdown:
 *   Medicare  (A0): all 9 → published
 *   Medicaid  (A1): all 9 → published
 *   Commercial (A2):
 *     HMO + Benefits  (P0,T0): published
 *     HMO + Claims    (P0,T1): published  (delegated to a vendor)
 *     HMO + Auth      (P0,T2): draft
 *     PPO + Benefits  (P1,T0): draft
 *     PPO + Claims    (P1,T1): draft
 *     PPO + Auth      (P1,T2): draft
 *     EPO + *         (P2,*)  : null → uncovered (tests pathway-coverage gaps)
 *
 * Total: 20 published | 4 draft | 3 uncovered
 */
const PATHWAY_SPECS = [
  // ── Medicare Member (A0) ───────────────────────────────────────────────────
  [
    // HMO (P0)
    [
      {
        status: "published",
        department: "Medicare HMO Benefits",
        phone: "1-800-555-0101",
        fax: "1-800-555-0102",
      },
      {
        status: "published",
        department: "Medicare HMO Claims",
        phone: "1-800-555-0103",
        notes: "Available Mon–Fri 8am–8pm ET",
      },
      {
        status: "published",
        department: "Medicare HMO Auth",
        phone: "1-800-555-0104",
      },
    ],
    // PPO (P1)
    [
      {
        status: "published",
        department: "Medicare PPO Benefits",
        phone: "1-800-555-0111",
      },
      {
        status: "published",
        department: "Medicare PPO Claims",
        phone: "1-800-555-0112",
        fax: "1-800-555-0113",
      },
      {
        status: "published",
        department: "Medicare PPO Auth",
        phone: "1-800-555-0114",
        notes: "Urgent auth: use fax",
      },
    ],
    // EPO (P2)
    [
      {
        status: "published",
        department: "Medicare EPO Benefits",
        phone: "1-800-555-0121",
      },
      {
        status: "published",
        department: "Medicare EPO Claims",
        phone: "1-800-555-0122",
      },
      {
        status: "published",
        department: "Medicare EPO Auth",
        phone: "1-800-555-0123",
      },
    ],
  ],
  // ── Medicaid Member (A1) ───────────────────────────────────────────────────
  [
    // HMO (P0)
    [
      {
        status: "published",
        department: "Medicaid HMO Benefits",
        phone: "1-800-555-0201",
      },
      {
        status: "published",
        department: "Medicaid HMO Claims",
        phone: "1-800-555-0202",
        notes: "Also handles coordination of benefits",
      },
      {
        status: "published",
        department: "Medicaid HMO Auth",
        phone: "1-800-555-0203",
      },
    ],
    // PPO (P1)
    [
      {
        status: "published",
        department: "Medicaid PPO Benefits",
        phone: "1-800-555-0211",
      },
      {
        status: "published",
        department: "Medicaid PPO Claims",
        phone: "1-800-555-0212",
      },
      {
        status: "published",
        department: "Medicaid PPO Auth",
        phone: "1-800-555-0213",
      },
    ],
    // EPO (P2)
    [
      {
        status: "published",
        department: "Medicaid EPO Benefits",
        phone: "1-800-555-0221",
      },
      {
        status: "published",
        department: "Medicaid EPO Claims",
        phone: "1-800-555-0222",
      },
      {
        status: "published",
        department: "Medicaid EPO Auth",
        phone: "1-800-555-0223",
      },
    ],
  ],
  // ── Commercial Member (A2) ────────────────────────────────────────────────
  [
    // HMO (P0)
    [
      {
        status: "published",
        department: "Commercial HMO Benefits",
        phone: "1-800-555-0301",
      },
      // Delegated pathway — tests is_delegated + vendor_name fields
      {
        status: "published",
        department: "Commercial HMO Claims",
        phone: "1-800-555-0302",
        is_delegated: true,
        vendor_name: "Acme Claims Solutions",
        notes:
          "Handled by third-party vendor; escalate unresolved claims to internal team",
      },
      {
        status: "draft",
        department: "Commercial HMO Auth",
        phone: "1-800-555-0303",
      },
    ],
    // PPO (P1)
    [
      {
        status: "draft",
        department: "Commercial PPO Benefits",
        phone: "1-800-555-0311",
      },
      {
        status: "draft",
        department: "Commercial PPO Claims",
        phone: "1-800-555-0312",
      },
      {
        status: "draft",
        department: "Commercial PPO Auth",
        phone: "1-800-555-0313",
      },
    ],
    // EPO (P2) — intentionally uncovered to test pathway-coverage report
    [null, null, null],
  ],
];

/**
 * PathwayEvent distribution for report endpoints.
 *
 * Each entry: [audienceIndex, planIndex, topicIndex, eventCount]
 * Spread over the last 30 days so pathway-views time-series is non-trivial.
 *
 * Medicare HMO Claims (#1 overall) → most popular in top-pathways
 * Medicare HMO Benefits (#2)
 * Claims & Billing (#1 topic overall)
 * Medicare (#1 audience)
 * HMO (#1 plan)
 */
const EVENT_DISTRIBUTION = [
  // Medicare HMO
  [0, 0, 1, 45], // Medicare + HMO + Claims (#1 pathway)
  [0, 0, 0, 30], // Medicare + HMO + Benefits (#2 pathway)
  [0, 0, 2, 12], // Medicare + HMO + Auth
  // Medicare PPO
  [0, 1, 0, 18], // Medicare + PPO + Benefits
  [0, 1, 1, 14], // Medicare + PPO + Claims
  [0, 1, 2, 6], // Medicare + PPO + Auth
  // Medicare EPO
  [0, 2, 0, 8], // Medicare + EPO + Benefits
  [0, 2, 1, 5], // Medicare + EPO + Claims
  [0, 2, 2, 2], // Medicare + EPO + Auth
  // Medicaid HMO
  [1, 0, 0, 10], // Medicaid + HMO + Benefits
  [1, 0, 1, 7], // Medicaid + HMO + Claims
  [1, 0, 2, 3], // Medicaid + HMO + Auth
  // Medicaid PPO / EPO
  [1, 1, 0, 4], // Medicaid + PPO + Benefits
  [1, 2, 1, 3], // Medicaid + EPO + Claims
  // Commercial HMO (published pathways only)
  [2, 0, 0, 5], // Commercial + HMO + Benefits
  [2, 0, 1, 3], // Commercial + HMO + Claims (delegated)
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function upsertByName(Model, records) {
  const results = [];
  for (const data of records) {
    let doc = await Model.findOne({ name: data.name });
    if (!doc) {
      const slug = generateSlug(data.name);
      doc = await Model.create({ ...data, slug });
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

async function upsertUser(email, password, role, firstName, lastName) {
  let user = await User.findOne({ email });
  if (!user) {
    const hashed = await bcrypt.hash(password, 12);
    user = await User.create({ email, password_hash: hashed, user_role: role });
    await Person.create({
      user_id: user._id,
      first_name: firstName,
      last_name: lastName,
    });
    logger.info({ message: "Created user", role, email });
  } else {
    logger.info({ message: "User already exists, skipping", email });
  }
  return user;
}

// Returns a random date within the last `days` days
function randomPastDate(days = 30) {
  const now = Date.now();
  const offset = Math.floor(Math.random() * days * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO_URI);
  logger.info("Connected to MongoDB");

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminUser = await upsertUser(
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    "admin",
    ADMIN_FIRST_NAME,
    ADMIN_LAST_NAME,
  );
  await upsertUser(
    "superuser@example.com",
    "SuperUser!Demo1",
    "super user",
    "Super",
    "User",
  );
  await upsertUser(
    "member@example.com",
    "Member!Demo1234",
    "user",
    "Member",
    "Demo",
  );

  // ── Reference data ────────────────────────────────────────────────────────
  const audiences = await upsertByName(Audience, AUDIENCES);
  const plans = await upsertByName(Plan, PLANS);
  const topics = await upsertByName(Topic, TOPICS);

  // Active subsets (indices 0–2) used for pathway + event seeding
  const activeAudiences = audiences.slice(0, 3);
  const activePlans = plans.slice(0, 3);
  const activeTopics = topics.slice(0, 3);

  // ── Contact pathways ──────────────────────────────────────────────────────
  let pwCreated = 0;
  let pwSkipped = 0;

  // pathwayIndex[ai][pi][ti] = pathway document (populated below)
  const pathwayIndex = Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => Array(3).fill(null)),
  );

  for (let ai = 0; ai < 3; ai++) {
    for (let pi = 0; pi < 3; pi++) {
      for (let ti = 0; ti < 3; ti++) {
        const spec = PATHWAY_SPECS[ai][pi][ti];
        if (!spec) continue; // intentionally uncovered

        const existing = await ContactPathway.findOne({
          audience_id: activeAudiences[ai]._id,
          plan_id: activePlans[pi]._id,
          topic_id: activeTopics[ti]._id,
        });

        if (existing) {
          pathwayIndex[ai][pi][ti] = existing;
          pwSkipped++;
          continue;
        }

        const {
          status,
          department,
          phone,
          fax,
          notes,
          is_delegated,
          vendor_name,
        } = spec;

        const pathway = await ContactPathway.create({
          audience_id: activeAudiences[ai]._id,
          plan_id: activePlans[pi]._id,
          topic_id: activeTopics[ti]._id,
          department,
          phone,
          ...(fax && { fax }),
          ...(notes && { notes }),
          ...(is_delegated && { is_delegated, vendor_name }),
          updated_by: adminUser._id,
        });

        if (status === "published") {
          pathway.status = "published";
          pathway.published_at = new Date();
          await pathway.save();
        }

        pathwayIndex[ai][pi][ti] = pathway;
        pwCreated++;
      }
    }
  }

  logger.info({
    message: "Pathways seeded",
    created: pwCreated,
    skipped: pwSkipped,
  });

  // ── PathwayEvents ─────────────────────────────────────────────────────────
  const existingEventCount = await PathwayEvent.countDocuments();
  if (existingEventCount > 0) {
    logger.info({
      message: "PathwayEvents already present, skipping",
      count: existingEventCount,
    });
  } else {
    let eventsCreated = 0;
    const eventDocs = [];

    for (const [ai, pi, ti, count] of EVENT_DISTRIBUTION) {
      const pathway = pathwayIndex[ai][pi][ti];
      if (!pathway) continue; // skip uncovered combinations

      for (let i = 0; i < count; i++) {
        eventDocs.push({
          pathway_id: pathway._id,
          audience_id: activeAudiences[ai]._id,
          plan_id: activePlans[pi]._id,
          topic_id: activeTopics[ti]._id,
          occurred_at: randomPastDate(30),
          ...(Math.random() < 0.3 && { embed_source: "member-portal" }),
        });
        eventsCreated++;
      }
    }

    await PathwayEvent.insertMany(eventDocs);
    logger.info({ message: "PathwayEvents seeded", created: eventsCreated });
  }

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
