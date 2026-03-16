import request from "supertest";
import app from "../app.js";

const BASE = "/api/v1/widget";
const USER_BASE = "/api/v1/users";
const AUDIENCE_BASE = "/api/v1/audiences";
const PLAN_BASE = "/api/v1/plans";
const TOPIC_BASE = "/api/v1/topics";
const PATHWAY_BASE = "/api/v1/pathways";

// Helper: register + auth an admin user and return token
const createAndAuthAdmin = async (
  email = "widget.admin@example.com",
  password = "Admin!Pass1234",
) => {
  await request(app)
    .post(`${USER_BASE}/register`)
    .send({ email, password, user_role: "admin" });

  const res = await request(app)
    .post(`${USER_BASE}/auth`)
    .send({ email, password });

  const cookie = res.headers["set-cookie"];
  return cookie?.[0]?.match(/jwt=([^;]+)/)?.[1];
};

// Helper: build a full set of refs and one published pathway
const buildPublishedPathway = async (token, suffix = "") => {
  const audience = await request(app)
    .post(AUDIENCE_BASE)
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: `Widget Audience ${suffix}`,
      is_active: true,
      sort_order: 1,
    });

  const plan = await request(app)
    .post(PLAN_BASE)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: `Widget Plan ${suffix}`, is_active: true, sort_order: 1 });

  const topic = await request(app)
    .post(TOPIC_BASE)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: `Widget Topic ${suffix}`, is_active: true, sort_order: 1 });

  const pathway = await request(app)
    .post(PATHWAY_BASE)
    .set("Authorization", `Bearer ${token}`)
    .send({
      audience_id: audience.body._id,
      plan_id: plan.body._id,
      topic_id: topic.body._id,
      department: "Claims Department",
      phone: "1-800-555-0000",
    });

  // Publish it
  await request(app)
    .put(`${PATHWAY_BASE}/${pathway.body._id}/publish`)
    .set("Authorization", `Bearer ${token}`);

  return {
    audienceId: audience.body._id,
    planId: plan.body._id,
    topicId: topic.body._id,
    pathwayId: pathway.body._id,
  };
};

// ─── GET /api/v1/widget/audiences ─────────────────────────────────────────────
describe("GET /api/v1/widget/audiences", () => {
  let token;

  beforeEach(async () => {
    token = await createAndAuthAdmin(
      "waud.admin@example.com",
      "Admin!Pass1234",
    );
    // Create one active and one inactive audience (via admin)
    await request(app)
      .post(AUDIENCE_BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Active Audience A", is_active: true, sort_order: 1 });

    const inactive = await request(app)
      .post(AUDIENCE_BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Inactive Audience B", is_active: false, sort_order: 2 });
    // Deactivate it explicitly (it may default to true)
    await request(app)
      .put(`${AUDIENCE_BASE}/${inactive.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ is_active: false });
  });

  it("returns 200 and only active audiences", async () => {
    const res = await request(app).get(`${BASE}/audiences`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const names = res.body.map((a) => a.name);
    expect(names).toContain("Active Audience A");
    // All returned records should be active
    res.body.forEach((a) => {
      // is_active is not selected, so just confirm inactive name absent
      expect(a.name).not.toBe("Inactive Audience B");
    });
  });

  it("returns only name, slug, description, sort_order fields", async () => {
    const res = await request(app).get(`${BASE}/audiences`);
    expect(res.status).toBe(200);
    if (res.body.length > 0) {
      const keys = Object.keys(res.body[0]);
      expect(keys).toContain("name");
      expect(keys).toContain("slug");
      expect(keys).toContain("sort_order");
      expect(keys).not.toContain("created_by");
      expect(keys).not.toContain("updated_by");
    }
  });

  it("requires no authentication", async () => {
    const res = await request(app).get(`${BASE}/audiences`);
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/v1/widget/plans ─────────────────────────────────────────────────
describe("GET /api/v1/widget/plans", () => {
  let token;
  let audienceId;
  let planId;

  beforeEach(async () => {
    token = await createAndAuthAdmin(
      "wpln.admin@example.com",
      "Admin!Pass1234",
    );
    const refs = await buildPublishedPathway(token, "PlanTest");
    audienceId = refs.audienceId;
    planId = refs.planId;
  });

  it("returns 200 and plans with published pathways for the audience", async () => {
    const res = await request(app).get(`${BASE}/plans?audience=${audienceId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((p) => p._id);
    expect(ids).toContain(planId);
  });

  it("returns 400 when audience param is missing", async () => {
    const res = await request(app).get(`${BASE}/plans`);
    expect(res.status).toBe(400);
  });

  it("returns empty array when audience has no published pathways", async () => {
    // Create a fresh audience with no pathways
    const newAudience = await request(app)
      .post(AUDIENCE_BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Audience No Pathways" });

    const res = await request(app).get(
      `${BASE}/plans?audience=${newAudience.body._id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("requires no authentication", async () => {
    const res = await request(app).get(`${BASE}/plans?audience=${audienceId}`);
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/v1/widget/topics ────────────────────────────────────────────────
describe("GET /api/v1/widget/topics", () => {
  let token;
  let audienceId;
  let planId;
  let topicId;

  beforeEach(async () => {
    token = await createAndAuthAdmin(
      "wtpc.admin@example.com",
      "Admin!Pass1234",
    );
    const refs = await buildPublishedPathway(token, "TopicTest");
    audienceId = refs.audienceId;
    planId = refs.planId;
    topicId = refs.topicId;
  });

  it("returns 200 and topics with published pathways for audience + plan", async () => {
    const res = await request(app).get(
      `${BASE}/topics?audience=${audienceId}&plan=${planId}`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const ids = res.body.map((t) => t._id);
    expect(ids).toContain(topicId);
  });

  it("returns 400 when audience param is missing", async () => {
    const res = await request(app).get(`${BASE}/topics?plan=${planId}`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when plan param is missing", async () => {
    const res = await request(app).get(`${BASE}/topics?audience=${audienceId}`);
    expect(res.status).toBe(400);
  });

  it("returns empty array when no published pathways for combination", async () => {
    const newPlan = await request(app)
      .post(PLAN_BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Plan No Widget Topics" });

    const res = await request(app).get(
      `${BASE}/topics?audience=${audienceId}&plan=${newPlan.body._id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("requires no authentication", async () => {
    const res = await request(app).get(
      `${BASE}/topics?audience=${audienceId}&plan=${planId}`,
    );
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/v1/widget/pathway ───────────────────────────────────────────────
describe("GET /api/v1/widget/pathway", () => {
  let token;
  let audienceId;
  let planId;
  let topicId;
  let pathwayId;

  beforeEach(async () => {
    token = await createAndAuthAdmin(
      "wpth.admin@example.com",
      "Admin!Pass1234",
    );
    const refs = await buildPublishedPathway(token, "PathwayTest");
    audienceId = refs.audienceId;
    planId = refs.planId;
    topicId = refs.topicId;
    pathwayId = refs.pathwayId;
  });

  it("returns 200 and the published pathway for the combination", async () => {
    const res = await request(app).get(
      `${BASE}/pathway?audience=${audienceId}&plan=${planId}&topic=${topicId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(pathwayId);
    expect(res.body.status).toBe("published");
  });

  it("populates audience_id, plan_id, topic_id with name and slug", async () => {
    const res = await request(app).get(
      `${BASE}/pathway?audience=${audienceId}&plan=${planId}&topic=${topicId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.audience_id).toHaveProperty("name");
    expect(res.body.audience_id).toHaveProperty("slug");
    expect(res.body.plan_id).toHaveProperty("name");
    expect(res.body.topic_id).toHaveProperty("name");
  });

  it("returns 400 when any query param is missing", async () => {
    const res = await request(app).get(
      `${BASE}/pathway?audience=${audienceId}&plan=${planId}`,
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when no published pathway exists for the combination", async () => {
    const newTopic = await request(app)
      .post(TOPIC_BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Topic No Pathway Widget" });

    const res = await request(app).get(
      `${BASE}/pathway?audience=${audienceId}&plan=${planId}&topic=${newTopic.body._id}`,
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for a draft pathway (not published)", async () => {
    // Create a draft pathway
    const newPlan = await request(app)
      .post(PLAN_BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Plan Draft Widget" });
    const newTopic = await request(app)
      .post(TOPIC_BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Topic Draft Widget" });

    await request(app)
      .post(PATHWAY_BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({
        audience_id: audienceId,
        plan_id: newPlan.body._id,
        topic_id: newTopic.body._id,
      });

    const res = await request(app).get(
      `${BASE}/pathway?audience=${audienceId}&plan=${newPlan.body._id}&topic=${newTopic.body._id}`,
    );
    expect(res.status).toBe(404);
  });

  it("requires no authentication", async () => {
    const res = await request(app).get(
      `${BASE}/pathway?audience=${audienceId}&plan=${planId}&topic=${topicId}`,
    );
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/v1/widget/event ────────────────────────────────────────────────
describe("POST /api/v1/widget/event", () => {
  let token;
  let audienceId;
  let planId;
  let topicId;
  let pathwayId;

  beforeEach(async () => {
    token = await createAndAuthAdmin(
      "wevt.admin@example.com",
      "Admin!Pass1234",
    );
    const refs = await buildPublishedPathway(token, "EventTest");
    audienceId = refs.audienceId;
    planId = refs.planId;
    topicId = refs.topicId;
    pathwayId = refs.pathwayId;
  });

  it("records an event and returns 201 with the event document", async () => {
    const res = await request(app)
      .post(`${BASE}/event`)
      .send({
        pathway_id: pathwayId,
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
      });

    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.pathway_id).toBe(pathwayId);
    expect(res.body.audience_id).toBe(audienceId);
    expect(res.body.plan_id).toBe(planId);
    expect(res.body.topic_id).toBe(topicId);
    expect(res.body.occurred_at).toBeDefined();
  });

  it("records an event with embed_source", async () => {
    const res = await request(app).post(`${BASE}/event`).send({
      pathway_id: pathwayId,
      audience_id: audienceId,
      plan_id: planId,
      topic_id: topicId,
      embed_source: "portal-home",
    });

    expect(res.status).toBe(201);
    expect(res.body.embed_source).toBe("portal-home");
  });

  it("records an event without embed_source", async () => {
    const res = await request(app)
      .post(`${BASE}/event`)
      .send({
        pathway_id: pathwayId,
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
      });

    expect(res.status).toBe(201);
    expect(res.body.embed_source).toBeUndefined();
  });

  it("returns 400 when pathway_id is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/event`)
      .send({ audience_id: audienceId, plan_id: planId, topic_id: topicId });

    expect(res.status).toBe(400);
  });

  it("returns 400 when audience_id is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/event`)
      .send({ pathway_id: pathwayId, plan_id: planId, topic_id: topicId });

    expect(res.status).toBe(400);
  });

  it("returns 400 when plan_id is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/event`)
      .send({
        pathway_id: pathwayId,
        audience_id: audienceId,
        topic_id: topicId,
      });

    expect(res.status).toBe(400);
  });

  it("returns 400 when topic_id is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/event`)
      .send({
        pathway_id: pathwayId,
        audience_id: audienceId,
        plan_id: planId,
      });

    expect(res.status).toBe(400);
  });

  it("requires no authentication", async () => {
    const res = await request(app)
      .post(`${BASE}/event`)
      .send({
        pathway_id: pathwayId,
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
      });

    expect(res.status).toBe(201);
  });

  it("does not include updatedAt (append-only model)", async () => {
    const res = await request(app)
      .post(`${BASE}/event`)
      .send({
        pathway_id: pathwayId,
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
      });

    expect(res.status).toBe(201);
    expect(res.body.updatedAt).toBeUndefined();
    expect(res.body.createdAt).toBeUndefined();
  });
});
