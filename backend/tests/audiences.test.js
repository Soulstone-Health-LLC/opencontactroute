import request from "supertest";
import app from "../app.js";

const BASE = "/api/v1/audiences";
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

// ─── POST /api/v1/audiences ───────────────────────────────────────────────────

describe("POST /api/v1/audiences", () => {
  it("should create an audience and return 201 for admin", async () => {
    const token = await createAndAuthUser(
      "aud-admin@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Member", description: "Health plan members" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Member");
    expect(res.body.slug).toBe("member");
    expect(res.body.description).toBe("Health plan members");
    expect(res.body.is_active).toBe(true);
    expect(res.body.sort_order).toBe(0);
    expect(res.body.created_by).toBeDefined();
  });

  it("should create an audience for super user", async () => {
    const token = await createAndAuthUser(
      "aud-super@example.com",
      "Password123!",
      "super user",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Provider" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Provider");
  });

  it("should return 403 for user role", async () => {
    const token = await createAndAuthUser(
      "aud-user@example.com",
      "Password123!",
      "user",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Broker" });

    expect(res.status).toBe(403);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).post(BASE).send({ name: "Anonymous" });

    expect(res.status).toBe(401);
  });

  it("should return 400 if name is missing", async () => {
    const token = await createAndAuthUser(
      "aud-noname@example.com",
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
      "aud-dupe@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Employer" });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "employer" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should auto-generate a slug from name", async () => {
    const token = await createAndAuthUser(
      "aud-slug@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Medicare Advantage Plan" });

    expect(res.body.slug).toBe("medicare-advantage-plan");
  });

  it("should respect custom is_active and sort_order", async () => {
    const token = await createAndAuthUser(
      "aud-opts@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Inactive Audience", is_active: false, sort_order: 5 });

    expect(res.body.is_active).toBe(false);
    expect(res.body.sort_order).toBe(5);
  });
});

// ─── GET /api/v1/audiences ────────────────────────────────────────────────────

describe("GET /api/v1/audiences", () => {
  it("should return all audiences for an authenticated user", async () => {
    const adminToken = await createAndAuthUser(
      "aud-list-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "aud-list-user@example.com",
      "Password123!",
      "user",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "List Member" });

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "List Provider" });

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("should filter by is_active", async () => {
    const token = await createAndAuthUser(
      "aud-filter@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Active Audience", is_active: true });

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Inactive Audience Filter", is_active: false });

    const res = await request(app)
      .get(`${BASE}?is_active=true`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.every((a) => a.is_active === true)).toBe(true);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/audiences/:id ────────────────────────────────────────────────

describe("GET /api/v1/audiences/:id", () => {
  it("should return an audience by ID", async () => {
    const token = await createAndAuthUser(
      "aud-getid@example.com",
      "Password123!",
      "admin",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Fetch By ID" });

    const res = await request(app)
      .get(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(createRes.body._id);
    expect(res.body.name).toBe("Fetch By ID");
  });

  it("should return 404 for a non-existent ID", async () => {
    const token = await createAndAuthUser(
      "aud-notfound@example.com",
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

// ─── PUT /api/v1/audiences/:id ────────────────────────────────────────────────

describe("PUT /api/v1/audiences/:id", () => {
  it("should update an audience for admin", async () => {
    const token = await createAndAuthUser(
      "aud-update@example.com",
      "Password123!",
      "admin",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Original Name" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name", description: "New description" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.description).toBe("New description");
    expect(res.body.slug).toBe("updated-name");
  });

  it("should update an audience for super user", async () => {
    const adminToken = await createAndAuthUser(
      "aud-upd-admin@example.com",
      "Password123!",
      "admin",
    );
    const superToken = await createAndAuthUser(
      "aud-upd-super@example.com",
      "Password123!",
      "super user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Super Update Target" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ sort_order: 10 });

    expect(res.status).toBe(200);
    expect(res.body.sort_order).toBe(10);
  });

  it("should return 400 when updating to a duplicate name", async () => {
    const token = await createAndAuthUser(
      "aud-updupe@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unique One" });

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unique Two" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Unique One" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should return 403 for user role", async () => {
    const adminToken = await createAndAuthUser(
      "aud-upd-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "aud-upd-403-user@example.com",
      "Password123!",
      "user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "403 Update Target" });

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ name: "Should Fail" });

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const token = await createAndAuthUser(
      "aud-upd-404@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .put(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/v1/audiences/:id ────────────────────────────────────────────

describe("DELETE /api/v1/audiences/:id", () => {
  it("should delete an audience for admin", async () => {
    const token = await createAndAuthUser(
      "aud-del@example.com",
      "Password123!",
      "admin",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "To Be Deleted" });

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
      "aud-del-403-admin@example.com",
      "Password123!",
      "admin",
    );
    const userToken = await createAndAuthUser(
      "aud-del-403-user@example.com",
      "Password123!",
      "user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Protected Audience" });

    const res = await request(app)
      .delete(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent ID", async () => {
    const token = await createAndAuthUser(
      "aud-del-404@example.com",
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
