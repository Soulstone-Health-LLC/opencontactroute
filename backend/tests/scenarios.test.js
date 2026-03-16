/**
 * Workflow scenario tests — end-to-end user journeys across multiple endpoints.
 *
 * Each describe block tells a complete story from setup through verification.
 * These complement the per-endpoint unit tests by catching regressions that only
 * surface when endpoints interact (e.g. publishing a pathway affects widget
 * responses; widget events roll up into report aggregations).
 */

import request from "supertest";
import app from "../app.js";

const USER_BASE = "/api/v1/users";
const AUDIENCE_BASE = "/api/v1/audiences";
const PLAN_BASE = "/api/v1/plans";
const TOPIC_BASE = "/api/v1/topics";
const PATHWAY_BASE = "/api/v1/pathways";
const WIDGET_BASE = "/api/v1/widget";
const REPORTS_BASE = "/api/v1/reports";

// ─── SHARED AUTH HELPER ───────────────────────────────────────────────────────

const createAndAuthUser = async (email, password, role = "user") => {
  await request(app)
    .post(`${USER_BASE}/register`)
    .send({ email, password, user_role: role });
  const res = await request(app)
    .post(`${USER_BASE}/auth`)
    .send({ email, password });
  return res.headers["set-cookie"]?.[0]?.match(/jwt=([^;]+)/)?.[1];
};

// ─── SCENARIO 1: Widget flow end-to-end ───────────────────────────────────────
//
// Story: An admin configures a contact pathway. A member then navigates the
// widget step-by-step (audience → plan → topic → pathway) and the final view
// is recorded as an event. Report endpoints then reflect that activity.
//
describe("Scenario: Widget flow end-to-end", () => {
  let adminToken;
  let audienceId, planId, topicId, pathwayId;

  beforeEach(async () => {
    adminToken = await createAndAuthUser(
      "wf.admin@example.com",
      "Admin!Pass1234",
      "admin",
    );

    // Admin creates reference data
    const [audRes, planRes, topicRes] = await Promise.all([
      request(app)
        .post(AUDIENCE_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "HMO Scenario Member", is_active: true, sort_order: 1 }),
      request(app)
        .post(PLAN_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "HMO Scenario Plan", is_active: true, sort_order: 1 }),
      request(app)
        .post(TOPIC_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "HMO Scenario Topic", is_active: true, sort_order: 1 }),
    ]);
    audienceId = audRes.body._id;
    planId = planRes.body._id;
    topicId = topicRes.body._id;

    // Admin creates and publishes a pathway
    const pwRes = await request(app)
      .post(PATHWAY_BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
        department: "HMO Scenario Dept",
        phone: "1-800-555-9001",
      });
    pathwayId = pwRes.body._id;

    await request(app)
      .put(`${PATHWAY_BASE}/${pathwayId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);
  });

  it("step 1: widget returns the audience in the active list", async () => {
    const res = await request(app).get(`${WIDGET_BASE}/audiences`);
    expect(res.status).toBe(200);
    const ids = res.body.map((a) => a._id);
    expect(ids).toContain(audienceId);
  });

  it("step 2: widget returns the plan filtered by audience", async () => {
    const res = await request(app).get(
      `${WIDGET_BASE}/plans?audience=${audienceId}`,
    );
    expect(res.status).toBe(200);
    const ids = res.body.map((p) => p._id);
    expect(ids).toContain(planId);
  });

  it("step 3: widget returns the topic filtered by audience + plan", async () => {
    const res = await request(app).get(
      `${WIDGET_BASE}/topics?audience=${audienceId}&plan=${planId}`,
    );
    expect(res.status).toBe(200);
    const ids = res.body.map((t) => t._id);
    expect(ids).toContain(topicId);
  });

  it("step 4: widget resolves the correct pathway", async () => {
    const res = await request(app).get(
      `${WIDGET_BASE}/pathway?audience=${audienceId}&plan=${planId}&topic=${topicId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(pathwayId);
    expect(res.body.department).toBe("HMO Scenario Dept");
  });

  it("step 5: widget fires a view event and records it", async () => {
    const res = await request(app)
      .post(`${WIDGET_BASE}/event`)
      .send({
        pathway_id: pathwayId,
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
      });
    expect(res.status).toBe(201);
    expect(res.body.pathway_id).toBe(pathwayId);
    expect(res.body.occurred_at).toBeDefined();
  });

  it("step 6: event appears in pathway-views report", async () => {
    // Fire the event first
    await request(app)
      .post(`${WIDGET_BASE}/event`)
      .send({
        pathway_id: pathwayId,
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
      });

    const res = await request(app)
      .get(`${REPORTS_BASE}/pathway-views`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const total = res.body.data.reduce((s, d) => s + d.count, 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });

  it("step 7: pathway appears in top-pathways report after events", async () => {
    // Fire 3 events
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post(`${WIDGET_BASE}/event`)
        .send({
          pathway_id: pathwayId,
          audience_id: audienceId,
          plan_id: planId,
          topic_id: topicId,
        });
    }

    const res = await request(app)
      .get(`${REPORTS_BASE}/top-pathways`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const match = res.body.data.find((p) => p.pathway_id === pathwayId);
    expect(match).toBeDefined();
    expect(match.count).toBe(3);
  });
});

// ─── SCENARIO 2: Draft → publish content moderation workflow ─────────────────
//
// Story: An admin creates a pathway in draft. The widget must NOT serve draft
// pathways. The admin publishes it. The widget then resolves it correctly, and
// the content-audit and pathway-coverage reports update accordingly.
//
describe("Scenario: Draft → publish content moderation workflow", () => {
  let adminToken;
  let audienceId, planId, topicId, pathwayId;

  beforeEach(async () => {
    adminToken = await createAndAuthUser(
      "cm.admin@example.com",
      "Admin!Pass1234",
      "admin",
    );

    const [audRes, planRes, topicRes] = await Promise.all([
      request(app)
        .post(AUDIENCE_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "CM Audience", is_active: true, sort_order: 1 }),
      request(app)
        .post(PLAN_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "CM Plan", is_active: true, sort_order: 1 }),
      request(app)
        .post(TOPIC_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "CM Topic", is_active: true, sort_order: 1 }),
    ]);
    audienceId = audRes.body._id;
    planId = planRes.body._id;
    topicId = topicRes.body._id;

    // Create pathway — stays in draft
    const pwRes = await request(app)
      .post(PATHWAY_BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
        department: "CM Dept",
        phone: "1-800-555-9002",
      });
    pathwayId = pwRes.body._id;
  });

  it("draft pathway is NOT returned by the widget route", async () => {
    const res = await request(app).get(
      `${WIDGET_BASE}/pathway?audience=${audienceId}&plan=${planId}&topic=${topicId}`,
    );
    expect(res.status).toBe(404);
  });

  it("draft pathway appears in content-audit with status=draft", async () => {
    const res = await request(app)
      .get(`${REPORTS_BASE}/content-audit?status=draft`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const match = res.body.data.find((p) => p._id === pathwayId);
    expect(match).toBeDefined();
    expect(match.status).toBe("draft");
  });

  it("pathway-coverage counts it as draft, not uncovered", async () => {
    const res = await request(app)
      .get(`${REPORTS_BASE}/pathway-coverage`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    // 1×1×1 = 1 total possible; 0 published; 1 draft; 0 uncovered
    expect(res.body.total_possible).toBe(1);
    expect(res.body.draft).toBe(1);
    expect(res.body.published).toBe(0);
    expect(res.body.uncovered).toBe(0);
  });

  it("after publishing, the widget resolves the pathway", async () => {
    await request(app)
      .put(`${PATHWAY_BASE}/${pathwayId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);

    const res = await request(app).get(
      `${WIDGET_BASE}/pathway?audience=${audienceId}&plan=${planId}&topic=${topicId}`,
    );
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(pathwayId);
  });

  it("after publishing, coverage report shows 1 published and 0 draft", async () => {
    await request(app)
      .put(`${PATHWAY_BASE}/${pathwayId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);

    const res = await request(app)
      .get(`${REPORTS_BASE}/pathway-coverage`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(1);
    expect(res.body.draft).toBe(0);
  });

  it("after publishing, it appears in content-audit with status=published", async () => {
    await request(app)
      .put(`${PATHWAY_BASE}/${pathwayId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);

    const res = await request(app)
      .get(`${REPORTS_BASE}/content-audit?status=published`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const match = res.body.data.find((p) => p._id === pathwayId);
    expect(match).toBeDefined();
    expect(match.status).toBe("published");
  });
});

// ─── SCENARIO 3: Coverage gap → fill gap lifecycle ────────────────────────────
//
// Story: An admin sets up reference data but leaves some combinations uncovered.
// The coverage report shows the gaps. The admin creates the missing pathways
// and the coverage counts update correctly after each addition.
//
describe("Scenario: Coverage gap → fill gap lifecycle", () => {
  let adminToken;
  let audienceId, planId, topicId;

  beforeEach(async () => {
    adminToken = await createAndAuthUser(
      "cov.admin@example.com",
      "Admin!Pass1234",
      "admin",
    );

    const [audRes, planRes, topicRes] = await Promise.all([
      request(app)
        .post(AUDIENCE_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Cov Audience", is_active: true, sort_order: 1 }),
      request(app)
        .post(PLAN_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Cov Plan", is_active: true, sort_order: 1 }),
      request(app)
        .post(TOPIC_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Cov Topic", is_active: true, sort_order: 1 }),
    ]);
    audienceId = audRes.body._id;
    planId = planRes.body._id;
    topicId = topicRes.body._id;
  });

  it("starts with 1 uncovered combination when no pathway exists", async () => {
    const res = await request(app)
      .get(`${REPORTS_BASE}/pathway-coverage`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total_possible).toBe(1);
    expect(res.body.uncovered).toBe(1);
    expect(res.body.uncovered_combinations).toHaveLength(1);
    const combo = res.body.uncovered_combinations[0];
    expect(combo.audience._id).toBe(audienceId);
    expect(combo.plan._id).toBe(planId);
    expect(combo.topic._id).toBe(topicId);
  });

  it("uncovered_combinations disappears after pathway is created", async () => {
    await request(app)
      .post(PATHWAY_BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
        department: "Cov Dept",
        phone: "1-800-555-9003",
      });

    const res = await request(app)
      .get(`${REPORTS_BASE}/pathway-coverage`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.uncovered).toBe(0);
    expect(res.body.uncovered_combinations).toHaveLength(0);
    expect(res.body.draft).toBe(1);
  });

  it("published + draft + uncovered always equals total_possible across state changes", async () => {
    // Check before pathway exists
    let res = await request(app)
      .get(`${REPORTS_BASE}/pathway-coverage`)
      .set("Authorization", `Bearer ${adminToken}`);
    let { published, draft, uncovered, total_possible } = res.body;
    expect(published + draft + uncovered).toBe(total_possible);

    // Create as draft
    const pwRes = await request(app)
      .post(PATHWAY_BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
        department: "Cov Dept",
        phone: "1-800-555-9004",
      });

    res = await request(app)
      .get(`${REPORTS_BASE}/pathway-coverage`)
      .set("Authorization", `Bearer ${adminToken}`);
    ({ published, draft, uncovered, total_possible } = res.body);
    expect(published + draft + uncovered).toBe(total_possible);

    // Publish it
    await request(app)
      .put(`${PATHWAY_BASE}/${pwRes.body._id}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);

    res = await request(app)
      .get(`${REPORTS_BASE}/pathway-coverage`)
      .set("Authorization", `Bearer ${adminToken}`);
    ({ published, draft, uncovered, total_possible } = res.body);
    expect(published + draft + uncovered).toBe(total_possible);
    expect(published).toBe(1);
    expect(draft).toBe(0);
    expect(uncovered).toBe(0);
  });
});

// ─── SCENARIO 4: Audit log integrity ─────────────────────────────────────────
//
// Story: An admin creates a pathway, edits it, and publishes it. The audit log
// must capture each action in order with correct field-level diffs.
//
describe("Scenario: Audit log integrity", () => {
  let adminToken;
  let audienceId, planId, topicId, pathwayId;

  beforeEach(async () => {
    adminToken = await createAndAuthUser(
      "al.admin@example.com",
      "Admin!Pass1234",
      "admin",
    );

    const [audRes, planRes, topicRes] = await Promise.all([
      request(app)
        .post(AUDIENCE_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "AL Audience", is_active: true, sort_order: 1 }),
      request(app)
        .post(PLAN_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "AL Plan", is_active: true, sort_order: 1 }),
      request(app)
        .post(TOPIC_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "AL Topic", is_active: true, sort_order: 1 }),
    ]);
    audienceId = audRes.body._id;
    planId = planRes.body._id;
    topicId = topicRes.body._id;

    const pwRes = await request(app)
      .post(PATHWAY_BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
        department: "Original Dept",
        phone: "1-800-555-9010",
      });
    pathwayId = pwRes.body._id;
  });

  it("pathway creation produces a create audit entry", async () => {
    const res = await request(app)
      .get(
        `${REPORTS_BASE}/audit-log?resource=ContactPathway&action=create&limit=100`,
      )
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const match = res.body.data.find(
      (e) => String(e.resource_id) === pathwayId,
    );
    expect(match).toBeDefined();
    expect(match.action).toBe("create");
  });

  it("updating a field produces an update entry with the correct diff", async () => {
    await request(app)
      .put(`${PATHWAY_BASE}/${pathwayId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ department: "Updated Dept" });

    const res = await request(app)
      .get(
        `${REPORTS_BASE}/audit-log?resource=ContactPathway&action=update&limit=100`,
      )
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    // Find an update entry for this pathway that touched "department"
    const updateEntry = res.body.data.find(
      (e) =>
        String(e.resource_id) === pathwayId &&
        e.changes.some((c) => c.field === "department"),
    );
    expect(updateEntry).toBeDefined();
    const deptChange = updateEntry.changes.find(
      (c) => c.field === "department",
    );
    expect(deptChange.old_value).toBe("Original Dept");
    expect(deptChange.new_value).toBe("Updated Dept");
  });

  it("publishing produces an additional update entry for the pathway", async () => {
    await request(app)
      .put(`${PATHWAY_BASE}/${pathwayId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);

    const res = await request(app)
      .get(
        `${REPORTS_BASE}/audit-log?resource=ContactPathway&action=update&limit=100`,
      )
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    // At least one update entry for this pathway has a status change to "published"
    const publishEntry = res.body.data.find(
      (e) =>
        String(e.resource_id) === pathwayId &&
        e.changes.some(
          (c) => c.field === "status" && c.new_value === "published",
        ),
    );
    expect(publishEntry).toBeDefined();
  });

  it("audit log entries for this pathway are in reverse-chronological order", async () => {
    // Create an update so there are multiple entries
    await request(app)
      .put(`${PATHWAY_BASE}/${pathwayId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ notes: "Added notes" });
    await request(app)
      .put(`${PATHWAY_BASE}/${pathwayId}/publish`)
      .set("Authorization", `Bearer ${adminToken}`);

    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log?resource=ContactPathway&limit=100`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const entries = res.body.data.filter(
      (e) => String(e.resource_id) === pathwayId,
    );
    expect(entries.length).toBeGreaterThanOrEqual(2);

    // Verify descending order
    for (let i = 1; i < entries.length; i++) {
      expect(
        new Date(entries[i - 1].changed_at).getTime(),
      ).toBeGreaterThanOrEqual(new Date(entries[i].changed_at).getTime());
    }
  });
});

// ─── SCENARIO 5: RBAC enforcement across the full stack ──────────────────────
//
// Story: The same content is accessed by users with different roles. The correct
// response (200, 403, or 404) is returned at each role boundary.
//
describe("Scenario: RBAC enforcement across the full stack", () => {
  let adminToken, superToken, userToken;
  let audienceId, planId, topicId, pathwayId;

  beforeEach(async () => {
    [adminToken, superToken, userToken] = await Promise.all([
      createAndAuthUser("rbac.admin@example.com", "Admin!Pass1234", "admin"),
      createAndAuthUser(
        "rbac.super@example.com",
        "Admin!Pass1234",
        "super user",
      ),
      createAndAuthUser("rbac.user@example.com", "Admin!Pass1234", "user"),
    ]);

    const [audRes, planRes, topicRes] = await Promise.all([
      request(app)
        .post(AUDIENCE_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "RBAC Audience", is_active: true, sort_order: 1 }),
      request(app)
        .post(PLAN_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "RBAC Plan", is_active: true, sort_order: 1 }),
      request(app)
        .post(TOPIC_BASE)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "RBAC Topic", is_active: true, sort_order: 1 }),
    ]);
    audienceId = audRes.body._id;
    planId = planRes.body._id;
    topicId = topicRes.body._id;

    const pwRes = await request(app)
      .post(PATHWAY_BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        audience_id: audienceId,
        plan_id: planId,
        topic_id: topicId,
        department: "RBAC Dept",
        phone: "1-800-555-9020",
      });
    pathwayId = pwRes.body._id;
  });

  it("unauthenticated request to a protected report returns 401", async () => {
    const res = await request(app).get(`${REPORTS_BASE}/content-audit`);
    expect(res.status).toBe(401);
  });

  it("regular user can access reports (pathway-views)", async () => {
    const res = await request(app)
      .get(`${REPORTS_BASE}/pathway-views`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });

  it("regular user cannot access the audit-log report (admin-only)", async () => {
    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it("super user cannot access the audit-log report (admin-only)", async () => {
    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log`)
      .set("Authorization", `Bearer ${superToken}`);
    expect(res.status).toBe(403);
  });

  it("admin can access the audit-log report", async () => {
    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it("regular user cannot update a pathway", async () => {
    const res = await request(app)
      .put(`${PATHWAY_BASE}/${pathwayId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ department: "Hijacked Dept" });
    expect(res.status).toBe(403);
  });

  it("super user can read persons and update a pathway (role has write access)", async () => {
    const personRes = await request(app)
      .get("/api/v1/persons")
      .set("Authorization", `Bearer ${superToken}`);
    expect(personRes.status).toBe(200);

    // super user is included in requireRole("admin", "super user") on pathways
    const pwRes = await request(app)
      .put(`${PATHWAY_BASE}/${pathwayId}`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ department: "Super Updated Dept" });
    expect(pwRes.status).toBe(200);
  });

  it("super user cannot update a person record (admin-only)", async () => {
    // Create a person record first via admin
    const personRes = await request(app)
      .get("/api/v1/persons")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(personRes.status).toBe(200);
    const firstPerson = personRes.body.data?.[0] ?? personRes.body[0];

    if (firstPerson) {
      const updateRes = await request(app)
        .put(`/api/v1/persons/${firstPerson._id}`)
        .set("Authorization", `Bearer ${superToken}`)
        .send({ first_name: "Hijacked" });
      expect(updateRes.status).toBe(403);
    }
  });

  it("widget is publicly accessible without authentication", async () => {
    const res = await request(app).get(`${WIDGET_BASE}/audiences`);
    expect(res.status).toBe(200);
  });
});
