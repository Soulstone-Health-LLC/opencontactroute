import request from "supertest";
import app from "../app.js";

const BASE = "/api/v1/plans";
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

// ─── POST /api/v1/plans ───────────────────────────────────────────────────────

describe("POST /api/v1/plans", () => {
  it("should create a plan and return 201 for admin", async () => {
    const token = await createAndAuthUser(
      "plan-admin@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Commercial", description: "Commercial plan members" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Commercial");
    expect(res.body.slug).toBe("commercial");
    expect(res.body.description).toBe("Commercial plan members");
    expect(res.body.is_active).toBe(true);
    expect(res.body.sort_order).toBe(0);
    expect(res.body.created_by).toBeDefined();
  });

  it("should create a plan for super user", async () => {
    const token = await createAndAuthUser(
      "plan-super@example.com",
      "Password123!",
      "super user",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Medicare Advantage" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Medicare Advantage");
    expect(res.body.slug).toBe("medicare-advantage");
  });

  it("should return 403 for user role", async () => {
    const token = await createAndAuthUser(
      "plan-user@example.com",
      "Password123!",
      "user",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Medicaid" });

    expect(res.status).toBe(403);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).post(BASE).send({ name: "Anonymous" });
    expect(res.status).toBe(401);
  });

  it("should return 400 if name is missing", async () => {
    const token = await createAndAuthUser(
      "plan-noname@example.com",
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
      "plan-dupe@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "HMO" });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "hmo" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should auto-generate a slug from name", async () => {
    const token = await createAndAuthUser(
      "plan-slug@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Medicare Supplement Plan" });

    expect(res.body.slug).toBe("medicare-supplement-plan");
  });

  it("should respect custom is_active and sort_order", async () => {
    const token = await createAndAuthUser(
      "plan-opts@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Inactive Plan", is_active: false, sort_order: 5 });

    expect(res.body.is_active).toBe(false);
    expect(res.body.sort_order).toBe(5);
  });
});

// ─── GET /api/v1/plans ────────────────────────────────────────────────────────

describe("GET /api/v1/plans", () => {
  it("should return all plans for an authenticated user", async () => {
    const adminToken = await createAndAuthUser(
      "plan-list-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "plan-list-user@example.com",
      "Password123!",
      "user",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "List PPO" });

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "List EPO" });

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("should filter by is_active", async () => {
    const token = await createAndAuthUser(
      "plan-filter@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Active Plan", is_active: true });

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Inactive Plan Filter", is_active: false });

    const res = await request(app)
      .get(`${BASE}?is_active=true`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.every((p) => p.is_active === true)).toBe(true);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/plans/:id ────────────────────────────────────────────────────

describe("GET /api/v1/plans/:id", () => {
  it("should return a plan by ID", async () => {
    const token = await createAndAuthUser(
      "plan-getid@example.com",
      "Password123!",
      "admin",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Fetch By ID Plan" });

    const res = await request(app)
      .get(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(createRes.body._id);
    expect(res.body.name).toBe("Fetch By ID Plan");
  });

  it("should return 404 for a non-existent ID", async () => {
    const token = await createAndAuthUser(
      "plan-notfound@example.com",
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

// ─── PUT /api/v1/plans/:id ────────────────────────────────────────────────────

describe("PUT /api/v1/plans/:id", () => {
  it("should update a plan for admin", async () => {
    const token = await createAndAuthUser(
      "plan-update@example.com",
      "Password123!",
      "admin",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Original Plan Name" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Plan Name", description: "New description" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Plan Name");
    expect(res.body.description).toBe("New description");
    expect(res.body.slug).toBe("updated-plan-name");
  });

  it("should update a plan for super user", async () => {
    const adminToken = await createAndAuthUser(
      "plan-upd-admin@example.com",
      "Password123!",
      "admin",
    );
    const superToken = await createAndAuthUser(
      "plan-upd-super@example.com",
      "Password123!",
      "super user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Super Update Plan Target" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ sort_order: 10 });

    expect(res.status).toBe(200);
    expect(res.body.sort_order).toBe(10);
  });

  it("should return 400 when updating to a duplicate name", async () => {
    const token = await createAndAuthUser(
      "plan-updupe@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unique Plan One" });

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unique Plan Two" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unique Plan One" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should return 403 for user role", async () => {
    const adminToken = await createAndAuthUser(
      "plan-upd-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "plan-upd-403-user@example.com",
      "Password123!",
      "user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "403 Plan Update Target" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Should Fail" });

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const token = await createAndAuthUser(
      "plan-upd-404@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .put(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ghost Plan" });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/v1/plans/:id ─────────────────────────────────────────────────

describe("DELETE /api/v1/plans/:id", () => {
  it("should delete a plan for admin", async () => {
    const token = await createAndAuthUser(
      "plan-del@example.com",
      "Password123!",
      "admin",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Plan To Be Deleted" });

    const res = await request(app)
      .delete(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    // Confirm it's gone
    const getRes = await request(app)
      .get(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it("should return 403 for user role", async () => {
    const adminToken = await createAndAuthUser(
      "plan-del-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "plan-del-403-user@example.com",
      "Password123!",
      "user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Protected Plan" });

    const res = await request(app)
      .delete(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const token = await createAndAuthUser(
      "plan-del-404@example.com",
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
