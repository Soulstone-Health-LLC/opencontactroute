import request from "supertest";
import app from "../app.js";

const BASE = "/api/v1/topics";
const USER_BASE = "/api/v1/users";

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

// ─── POST /api/v1/topics ──────────────────────────────────────────────────────

describe("POST /api/v1/topics", () => {
  it("should create a topic and return 201 for admin", async () => {
    const token = await createAndAuthUser(
      "topic-admin@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Claims", description: "Claim inquiries" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Claims");
    expect(res.body.slug).toBe("claims");
    expect(res.body.description).toBe("Claim inquiries");
    expect(res.body.is_active).toBe(true);
    expect(res.body.sort_order).toBe(0);
    expect(res.body.created_by).toBeDefined();
  });

  it("should create a topic for super user", async () => {
    const token = await createAndAuthUser(
      "topic-super@example.com",
      "Password123!",
      "super user",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Prior Authorization" });

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe("prior-authorization");
  });

  it("should return 403 for user role", async () => {
    const token = await createAndAuthUser(
      "topic-user@example.com",
      "Password123!",
      "user",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Billing" });

    expect(res.status).toBe(403);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).post(BASE).send({ name: "Anonymous" });
    expect(res.status).toBe(401);
  });

  it("should return 400 if name is missing", async () => {
    const token = await createAndAuthUser(
      "topic-noname@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "No name here" });

    expect(res.status).toBe(400);
  });

  it("should return 400 for duplicate name (case-insensitive)", async () => {
    const token = await createAndAuthUser(
      "topic-dupe@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Eligibility" });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "eligibility" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should auto-generate a slug from name", async () => {
    const token = await createAndAuthUser(
      "topic-slug@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Referral And Authorization" });

    expect(res.body.slug).toBe("referral-and-authorization");
  });

  it("should respect custom is_active and sort_order", async () => {
    const token = await createAndAuthUser(
      "topic-opts@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Inactive Topic", is_active: false, sort_order: 5 });

    expect(res.body.is_active).toBe(false);
    expect(res.body.sort_order).toBe(5);
  });
});

// ─── GET /api/v1/topics ───────────────────────────────────────────────────────

describe("GET /api/v1/topics", () => {
  it("should return all topics for an authenticated user", async () => {
    const adminToken = await createAndAuthUser(
      "topic-list-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "topic-list-user@example.com",
      "Password123!",
      "user",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "List Topic A" });

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "List Topic B" });

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("should filter by is_active", async () => {
    const token = await createAndAuthUser(
      "topic-filter@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Active Topic", is_active: true });

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Inactive Topic Filter", is_active: false });

    const res = await request(app)
      .get(`${BASE}?is_active=true`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.every((t) => t.is_active === true)).toBe(true);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/topics/:id ───────────────────────────────────────────────────

describe("GET /api/v1/topics/:id", () => {
  it("should return a topic by ID", async () => {
    const token = await createAndAuthUser(
      "topic-getid@example.com",
      "Password123!",
      "admin",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Fetch By ID Topic" });

    const res = await request(app)
      .get(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(createRes.body._id);
    expect(res.body.name).toBe("Fetch By ID Topic");
  });

  it("should return 404 for a non-existent ID", async () => {
    const token = await createAndAuthUser(
      "topic-notfound@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .get(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(`${BASE}/507f1f77bcf86cd799439011`);
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/v1/topics/:id ───────────────────────────────────────────────────

describe("PUT /api/v1/topics/:id", () => {
  it("should update a topic for admin", async () => {
    const token = await createAndAuthUser(
      "topic-update@example.com",
      "Password123!",
      "admin",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Original Topic Name" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Topic Name", description: "New description" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Topic Name");
    expect(res.body.description).toBe("New description");
    expect(res.body.slug).toBe("updated-topic-name");
  });

  it("should return 400 when updating to a duplicate name", async () => {
    const token = await createAndAuthUser(
      "topic-updupe@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unique Topic One" });

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unique Topic Two" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unique Topic One" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should return 403 for user role", async () => {
    const adminToken = await createAndAuthUser(
      "topic-upd-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "topic-upd-403-user@example.com",
      "Password123!",
      "user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "403 Topic Update Target" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Should Fail" });

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const token = await createAndAuthUser(
      "topic-upd-404@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .put(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ghost Topic" });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/v1/topics/:id ────────────────────────────────────────────────

describe("DELETE /api/v1/topics/:id", () => {
  it("should delete a topic for admin", async () => {
    const token = await createAndAuthUser(
      "topic-del@example.com",
      "Password123!",
      "admin",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Topic To Be Deleted" });

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
      "topic-del-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "topic-del-403-user@example.com",
      "Password123!",
      "user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Protected Topic" });

    const res = await request(app)
      .delete(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const token = await createAndAuthUser(
      "topic-del-404@example.com",
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
