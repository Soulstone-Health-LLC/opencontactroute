import request from "supertest";
import app from "../app.js";

const BASE = "/api/v1/pathways";
const USER_BASE = "/api/v1/users";
const AUDIENCE_BASE = "/api/v1/audiences";
const PLAN_BASE = "/api/v1/plans";
const TOPIC_BASE = "/api/v1/topics";

// Helper: register + auth a user and return token
const createAndAuthUser = async (email, password, role = "user") => {
  await request(app)
    .post(`${USER_BASE}/register`)
    .send({ email, password, user_role: role });

  const res = await request(app)
    .post(`${USER_BASE}/auth`)
    .send({ email, password });

  const cookie = res.headers["set-cookie"];
  const token = cookie?.[0]?.match(/jwt=([^;]+)/)?.[1];
  return token;
};

// Helper: create audience, plan, topic and return their IDs
const createRefs = async (token, suffix = "") => {
  const audience = await request(app)
    .post(AUDIENCE_BASE)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: `Pathway Audience ${suffix}` });

  const plan = await request(app)
    .post(PLAN_BASE)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: `Pathway Plan ${suffix}` });

  const topic = await request(app)
    .post(TOPIC_BASE)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: `Pathway Topic ${suffix}` });

  return {
    audience_id: audience.body._id,
    plan_id: plan.body._id,
    topic_id: topic.body._id,
  };
};

// ─── POST /api/v1/pathways ────────────────────────────────────────────────────

describe("POST /api/v1/pathways", () => {
  it("should create a pathway and return 201 for admin", async () => {
    const token = await createAndAuthUser(
      "pw-admin@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "create-admin");

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...refs,
        department: "Member Services",
        phone: "1-800-555-0100",
        notes: "Available M-F 8am-5pm",
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
    expect(res.body.department).toBe("Member Services");
    expect(res.body.phone).toBe("1-800-555-0100");
    expect(res.body.is_delegated).toBe(false);
    expect(res.body.created_by).toBeDefined();
    expect(res.body.published_at).toBeNull();
  });

  it("should create a pathway for super user", async () => {
    const token = await createAndAuthUser(
      "pw-super@example.com",
      "Password123!",
      "super user",
    );
    const refs = await createRefs(token, "create-super");

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
  });

  it("should return 403 for user role", async () => {
    const adminToken = await createAndAuthUser(
      "pw-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "pw-403-user@example.com",
      "Password123!",
      "user",
    );
    const refs = await createRefs(adminToken, "create-403");

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ ...refs });

    expect(res.status).toBe(403);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).post(BASE).send({});
    expect(res.status).toBe(401);
  });

  it("should return 400 if required refs are missing", async () => {
    const token = await createAndAuthUser(
      "pw-missing@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ department: "No refs" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("should return 400 for duplicate audience+plan+topic combination", async () => {
    const token = await createAndAuthUser(
      "pw-dupe@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "dupe");

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should return 400 if is_delegated is true without vendor_name", async () => {
    const token = await createAndAuthUser(
      "pw-delegated@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "delegated");

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs, is_delegated: true });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/vendor_name/i);
  });

  it("should create a delegated pathway when vendor_name is provided", async () => {
    const token = await createAndAuthUser(
      "pw-delegated-ok@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "delegated-ok");

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs, is_delegated: true, vendor_name: "Acme Health" });

    expect(res.status).toBe(201);
    expect(res.body.is_delegated).toBe(true);
    expect(res.body.vendor_name).toBe("Acme Health");
  });
});

// ─── GET /api/v1/pathways ─────────────────────────────────────────────────────

describe("GET /api/v1/pathways", () => {
  it("should return all pathways for an authenticated user", async () => {
    const adminToken = await createAndAuthUser(
      "pw-list-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "pw-list-user@example.com",
      "Password123!",
      "user",
    );

    const refs = await createRefs(adminToken, "list");
    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...refs });

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    // populated refs
    expect(res.body[0].audience_id).toHaveProperty("name");
    expect(res.body[0].plan_id).toHaveProperty("name");
    expect(res.body[0].topic_id).toHaveProperty("name");
  });

  it("should filter by status", async () => {
    const token = await createAndAuthUser(
      "pw-filter@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "filter");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs });

    // Publish it
    await request(app)
      .put(`${BASE}/${createRes.body._id}/publish`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .get(`${BASE}?status=published`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.every((p) => p.status === "published")).toBe(true);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/pathways/:id ─────────────────────────────────────────────────

describe("GET /api/v1/pathways/:id", () => {
  it("should return a pathway by ID with populated refs", async () => {
    const token = await createAndAuthUser(
      "pw-getid@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "getid");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs, department: "Claims Dept" });

    const res = await request(app)
      .get(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(createRes.body._id);
    expect(res.body.department).toBe("Claims Dept");
    expect(res.body.audience_id).toHaveProperty("name");
  });

  it("should return 404 for a non-existent ID", async () => {
    const token = await createAndAuthUser(
      "pw-notfound@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .get(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(`${BASE}/507f1f77bcf86cd799439011`);
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/v1/pathways/:id ─────────────────────────────────────────────────

describe("PUT /api/v1/pathways/:id", () => {
  it("should update pathway content fields for admin", async () => {
    const token = await createAndAuthUser(
      "pw-update@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "update");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs, phone: "1-800-000-0001" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ phone: "1-800-000-0002", notes: "Updated notes" });

    expect(res.status).toBe(200);
    expect(res.body.phone).toBe("1-800-000-0002");
    expect(res.body.notes).toBe("Updated notes");
  });

  it("should return 400 when updating to a duplicate combination", async () => {
    const token = await createAndAuthUser(
      "pw-upd-dupe@example.com",
      "Password123!",
      "admin",
    );
    const refs1 = await createRefs(token, "upd-dupe-1");
    const refs2 = await createRefs(token, "upd-dupe-2");

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs1 });

    const createRes2 = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs2 });

    const res = await request(app)
      .put(`${BASE}/${createRes2.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should return 400 when setting is_delegated without vendor_name", async () => {
    const token = await createAndAuthUser(
      "pw-upd-delegated@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "upd-delegated");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ is_delegated: true });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/vendor_name/i);
  });

  it("should return 403 for user role", async () => {
    const adminToken = await createAndAuthUser(
      "pw-upd-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "pw-upd-403-user@example.com",
      "Password123!",
      "user",
    );
    const refs = await createRefs(adminToken, "upd-403");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...refs });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ notes: "forbidden" });

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const token = await createAndAuthUser(
      "pw-upd-404@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .put(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`)
      .send({ notes: "ghost" });

    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/v1/pathways/:id/publish ────────────────────────────────────────

describe("PUT /api/v1/pathways/:id/publish", () => {
  it("should publish a pathway and set published_at", async () => {
    const token = await createAndAuthUser(
      "pw-publish@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "publish");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs });

    expect(createRes.body.status).toBe("draft");

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}/publish`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("published");
    expect(res.body.published_at).not.toBeNull();
    expect(res.body.audience_id).toMatchObject({ name: expect.any(String) });
    expect(res.body.plan_id).toMatchObject({ name: expect.any(String) });
    expect(res.body.topic_id).toMatchObject({ name: expect.any(String) });
  });

  it("should return 403 for user role", async () => {
    const adminToken = await createAndAuthUser(
      "pw-pub-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "pw-pub-403-user@example.com",
      "Password123!",
      "user",
    );
    const refs = await createRefs(adminToken, "pub-403");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...refs });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}/publish`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const token = await createAndAuthUser(
      "pw-pub-404@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .put(`${BASE}/507f1f77bcf86cd799439011/publish`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/v1/pathways/:id/unpublish ──────────────────────────────────────

describe("PUT /api/v1/pathways/:id/unpublish", () => {
  it("should revert a pathway to draft and clear published_at", async () => {
    const token = await createAndAuthUser(
      "pw-unpublish@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "unpublish");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs });

    // Publish first
    await request(app)
      .put(`${BASE}/${createRes.body._id}/publish`)
      .set("Authorization", `Bearer ${token}`);

    // Then unpublish
    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}/unpublish`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("draft");
    expect(res.body.published_at).toBeNull();
    expect(res.body.audience_id).toMatchObject({ name: expect.any(String) });
    expect(res.body.plan_id).toMatchObject({ name: expect.any(String) });
    expect(res.body.topic_id).toMatchObject({ name: expect.any(String) });
  });

  it("should return 403 for user role", async () => {
    const adminToken = await createAndAuthUser(
      "pw-unpub-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "pw-unpub-403-user@example.com",
      "Password123!",
      "user",
    );
    const refs = await createRefs(adminToken, "unpub-403");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...refs });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}/unpublish`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const token = await createAndAuthUser(
      "pw-unpub-404@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .put(`${BASE}/507f1f77bcf86cd799439011/unpublish`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/v1/pathways/:id ─────────────────────────────────────────────

describe("DELETE /api/v1/pathways/:id", () => {
  it("should delete a pathway for admin", async () => {
    const token = await createAndAuthUser(
      "pw-del@example.com",
      "Password123!",
      "admin",
    );
    const refs = await createRefs(token, "delete");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...refs });

    const res = await request(app)
      .delete(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    const getRes = await request(app)
      .get(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it("should return 403 for user role", async () => {
    const adminToken = await createAndAuthUser(
      "pw-del-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "pw-del-403-user@example.com",
      "Password123!",
      "user",
    );
    const refs = await createRefs(adminToken, "del-403");

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...refs });

    const res = await request(app)
      .delete(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const token = await createAndAuthUser(
      "pw-del-404@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .delete(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).delete(`${BASE}/507f1f77bcf86cd799439011`);
    expect(res.status).toBe(401);
  });
});
