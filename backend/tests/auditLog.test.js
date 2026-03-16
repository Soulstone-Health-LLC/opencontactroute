import request from "supertest";
import app from "../app.js";
import AuditLog from "../models/auditLogModel.js";

const USER_BASE = "/api/v1/users";
const PERSON_BASE = "/api/v1/persons";
const REPORTS_BASE = "/api/v1/reports";

// Helper to register, auth, and return token + userId
const createAndAuthUser = async (email, password, role = "user") => {
  const registerRes = await request(app)
    .post(`${USER_BASE}/register`)
    .send({ email, password, user_role: role });

  const authRes = await request(app)
    .post(`${USER_BASE}/auth`)
    .send({ email, password });

  const cookie = authRes.headers["set-cookie"];
  const token = cookie?.[0]?.match(/jwt=([^;]+)/)?.[1];

  return { token, userId: registerRes.body._id };
};

// Helper to create a person and return the person document
const createPerson = async (token, userId, overrides = {}) =>
  request(app)
    .post(PERSON_BASE)
    .set("Authorization", `Bearer ${token}`)
    .send({
      user_id: userId,
      first_name: "Audit",
      last_name: "Test",
      ...overrides,
    });

// ─── AUDIT LOG: Person creation ───────────────────────────────────────────────

describe("Audit Log — Person creation", () => {
  it("should write a create audit log entry when a person is created", async () => {
    const { token, userId } = await createAndAuthUser(
      "auditcreate@example.com",
      "Password123!",
    );

    await createPerson(token, userId);

    const logs = await AuditLog.find({ resource: "Person", action: "create" });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("create");
    expect(logs[0].changes).toHaveLength(0);
    expect(logs[0].resource_id).toBeDefined();
  });

  it("should record the authenticated user as changed_by on person creation", async () => {
    const { token, userId } = await createAndAuthUser(
      "auditby@example.com",
      "Password123!",
    );

    await createPerson(token, userId);

    const log = await AuditLog.findOne({
      resource: "Person",
      action: "create",
    });
    expect(log.changed_by.toString()).toBe(userId);
  });
});

// ─── AUDIT LOG: Person update ─────────────────────────────────────────────────

describe("Audit Log — Person update", () => {
  it("should write an update audit log entry with field diffs when a person is updated", async () => {
    const { token, userId } = await createAndAuthUser(
      "auditupdate@example.com",
      "Password123!",
    );

    const createRes = await createPerson(token, userId, {
      first_name: "Before",
    });
    const personId = createRes.body._id;

    await request(app)
      .put(`${PERSON_BASE}/${personId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ first_name: "After" });

    const updateLog = await AuditLog.findOne({
      resource: "Person",
      action: "update",
    });

    expect(updateLog).not.toBeNull();

    const change = updateLog.changes.find((c) => c.field === "first_name");
    expect(change).toBeDefined();
    expect(change.old_value).toBe("Before");
    expect(change.new_value).toBe("After");
  });

  it("should record the authenticated user as changed_by on person update", async () => {
    const { token, userId } = await createAndAuthUser(
      "auditupdateby@example.com",
      "Password123!",
    );

    const createRes = await createPerson(token, userId);
    const personId = createRes.body._id;

    await request(app)
      .put(`${PERSON_BASE}/${personId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ first_name: "Changed" });

    const updateLog = await AuditLog.findOne({
      resource: "Person",
      action: "update",
    });

    expect(updateLog.changed_by.toString()).toBe(userId);
  });

  it("should only record fields that actually changed", async () => {
    const { token, userId } = await createAndAuthUser(
      "auditdiff@example.com",
      "Password123!",
    );

    const createRes = await createPerson(token, userId, {
      first_name: "John",
      last_name: "Doe",
    });
    const personId = createRes.body._id;

    await request(app)
      .put(`${PERSON_BASE}/${personId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ first_name: "Jane" });

    const updateLog = await AuditLog.findOne({
      resource: "Person",
      action: "update",
    });

    const changedFields = updateLog.changes.map((c) => c.field);
    expect(changedFields).toContain("first_name");
    expect(changedFields).not.toContain("last_name");
  });

  it("should write an update audit log entry for profile update", async () => {
    const { token, userId } = await createAndAuthUser(
      "auditprofile@example.com",
      "Password123!",
    );

    await createPerson(token, userId, { last_name: "Original" });

    await request(app)
      .put(`${PERSON_BASE}/profile`)
      .set("Authorization", `Bearer ${token}`)
      .send({ last_name: "Updated" });

    const updateLog = await AuditLog.findOne({
      resource: "Person",
      action: "update",
    });

    expect(updateLog).not.toBeNull();
    const change = updateLog.changes.find((c) => c.field === "last_name");
    expect(change.old_value).toBe("Original");
    expect(change.new_value).toBe("Updated");
  });
});

// ─── AUDIT LOG: User registration ─────────────────────────────────────────────

describe("Audit Log — User registration", () => {
  it("should write a create audit log entry for user registration", async () => {
    await request(app)
      .post(`${USER_BASE}/register`)
      .send({ email: "audituser@example.com", password: "Password123!" });

    const log = await AuditLog.findOne({ resource: "User", action: "create" });
    expect(log).not.toBeNull();
    expect(log.action).toBe("create");
  });

  it("should record null as changed_by for self-registration (public endpoint)", async () => {
    await request(app)
      .post(`${USER_BASE}/register`)
      .send({ email: "auditnull@example.com", password: "Password123!" });

    const log = await AuditLog.findOne({ resource: "User", action: "create" });
    expect(log.changed_by).toBeNull();
  });
});

// ─── GET /api/v1/reports/audit-log ────────────────────────────────────────────

describe("GET /api/v1/reports/audit-log", () => {
  it("should return paginated audit log entries for an admin user", async () => {
    const { token, userId } = await createAndAuthUser(
      "reportadmin@example.com",
      "Password123!",
      "admin",
    );

    await createPerson(token, userId);

    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("limit");
    expect(res.body).toHaveProperty("pages");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it("should return 403 for a user with role 'user'", async () => {
    const { token } = await createAndAuthUser(
      "reportuser@example.com",
      "Password123!",
      "user",
    );

    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should return 403 for a user with role 'super user'", async () => {
    const { token } = await createAndAuthUser(
      "reportsuperuser@example.com",
      "Password123!",
      "super user",
    );

    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(`${REPORTS_BASE}/audit-log`);
    expect(res.status).toBe(401);
  });

  it("should filter results by resource type", async () => {
    const { token, userId } = await createAndAuthUser(
      "filteradmin@example.com",
      "Password123!",
      "admin",
    );

    await createPerson(token, userId);

    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log?resource=Person`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((log) => log.resource === "Person")).toBe(true);
  });

  it("should filter results by action", async () => {
    const { token, userId } = await createAndAuthUser(
      "filteraction@example.com",
      "Password123!",
      "admin",
    );

    await createPerson(token, userId);

    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log?action=create`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((log) => log.action === "create")).toBe(true);
  });

  it("should respect page and limit query parameters", async () => {
    const { token } = await createAndAuthUser(
      "pageadmin@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log?page=1&limit=5`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(5);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it("should populate changed_by with email", async () => {
    const { token, userId } = await createAndAuthUser(
      "populateadmin@example.com",
      "Password123!",
      "admin",
    );

    await createPerson(token, userId);

    const res = await request(app)
      .get(`${REPORTS_BASE}/audit-log?resource=Person&action=create`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const entry = res.body.data.find(
      (log) => log.action === "create" && log.resource === "Person",
    );
    expect(entry).toBeDefined();
    expect(entry.changed_by).toHaveProperty("email");
  });
});
