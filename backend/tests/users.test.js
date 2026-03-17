import request from "supertest";
import app from "../app.js";

const BASE = "/api/v1/users";

// Helper to register and auth a user, returning the JWT cookie
const createAndAuthUser = async (email, password) => {
  await request(app).post(`${BASE}/register`).send({ email, password });
  const res = await request(app).post(`${BASE}/auth`).send({ email, password });
  const cookie = res.headers["set-cookie"];
  const token = cookie?.[0]?.match(/jwt=([^;]+)/)?.[1];
  return token;
};

// ─── POST /register ─────────────────────────────────────────────────────────

describe("POST /api/v1/users/register", () => {
  it("should register a new user and return 201 with user data", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "new@example.com", password: "Password123!" });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("new@example.com");
    expect(res.body.is_active).toBe(true);
    expect(res.body.user_role).toBe("user");
    expect(res.body.password_hash).toBeUndefined();
  });

  it("should return 400 if password is missing", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "nopw@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/password is required/i);
  });

  it("should return 400 if email is invalid format", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "not-an-email", password: "Password123!" });

    expect(res.status).toBe(400);
  });

  it("should return 400 if user already exists", async () => {
    await request(app)
      .post(`${BASE}/register`)
      .send({ email: "dupe@example.com", password: "Password123!" });

    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "dupe@example.com", password: "Password123!" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/user already exists/i);
  });

  it("should set an httpOnly JWT cookie on successful registration", async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "cookie@example.com", password: "Password123!" });

    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toMatch(/jwt=/);
    expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
  });

  it("should respect custom is_active and user_role values", async () => {
    const res = await request(app).post(`${BASE}/register`).send({
      email: "admin@example.com",
      password: "Password123!",
      user_role: "admin",
      is_active: false,
    });

    expect(res.status).toBe(201);
    expect(res.body.user_role).toBe("admin");
    expect(res.body.is_active).toBe(false);
  });
});

// ─── POST /auth ──────────────────────────────────────────────────────────────

describe("POST /api/v1/users/auth", () => {
  beforeEach(async () => {
    await request(app)
      .post(`${BASE}/register`)
      .send({ email: "auth@example.com", password: "Password123!" });
  });

  it("should authenticate and return user data with 200", async () => {
    const res = await request(app)
      .post(`${BASE}/auth`)
      .send({ email: "auth@example.com", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("auth@example.com");
    expect(res.body.password_hash).toBeUndefined();
  });

  it("should set a JWT cookie on successful auth", async () => {
    const res = await request(app)
      .post(`${BASE}/auth`)
      .send({ email: "auth@example.com", password: "Password123!" });

    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toMatch(/jwt=/);
    expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app)
      .post(`${BASE}/auth`)
      .send({ email: "auth@example.com", password: "WrongPassword!" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it("should return 401 for non-existent user", async () => {
    const res = await request(app)
      .post(`${BASE}/auth`)
      .send({ email: "nobody@example.com", password: "Password123!" });

    expect(res.status).toBe(401);
  });

  it("should return 401 for inactive user", async () => {
    await request(app).post(`${BASE}/register`).send({
      email: "inactive@example.com",
      password: "Password123!",
      is_active: false,
    });

    const res = await request(app)
      .post(`${BASE}/auth`)
      .send({ email: "inactive@example.com", password: "Password123!" });

    expect(res.status).toBe(401);
  });
});

// ─── GET /profile ────────────────────────────────────────────────────────────

describe("GET /api/v1/users/profile", () => {
  it("should return the user profile with a valid token", async () => {
    const token = await createAndAuthUser(
      "profile@example.com",
      "Password123!",
    );

    const res = await request(app)
      .get(`${BASE}/profile`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("profile@example.com");
    expect(res.body.password_hash).toBeUndefined();
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(`${BASE}/profile`);
    expect(res.status).toBe(401);
  });

  it("should return 401 with an invalid token", async () => {
    const res = await request(app)
      .get(`${BASE}/profile`)
      .set("Authorization", "Bearer invalidtoken");

    expect(res.status).toBe(401);
  });
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

describe("POST /api/v1/users/logout", () => {
  it("should return 200 and clear the JWT cookie", async () => {
    const token = await createAndAuthUser("logout@example.com", "Password123!");

    const res = await request(app)
      .post(`${BASE}/logout`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
    // Cookie should be cleared (empty value and expired)
    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toMatch(/jwt=/);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
  });

  it("should return 401 when not authenticated", async () => {
    const res = await request(app).post(`${BASE}/logout`);
    expect(res.status).toBe(401);
  });
});

// ─── GET / (admin list all users) ─────────────────────────────────────────────

describe("GET /api/v1/users/", () => {
  let adminToken;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send({
      email: "list.admin@example.com",
      password: "Password123!",
      user_role: "admin",
    });
    adminToken = await createAndAuthUser(
      "list.admin@example.com",
      "Password123!",
    );

    // Create a regular user too
    await request(app)
      .post(`${BASE}/register`)
      .send({ email: "list.user@example.com", password: "Password123!" });
  });

  it("returns 200 and array of users for admin", async () => {
    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("never includes password_hash in results", async () => {
    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.forEach((u) => {
      expect(u.password_hash).toBeUndefined();
    });
  });

  it("returns 403 for non-admin user", async () => {
    const userToken = await createAndAuthUser(
      "list.regular@example.com",
      "Password123!",
    );

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 401 with no token", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

// ─── GET /:id (admin get user by ID) ──────────────────────────────────────────

describe("GET /api/v1/users/:id", () => {
  let adminToken;
  let targetId;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send({
      email: "getid.admin@example.com",
      password: "Password123!",
      user_role: "admin",
    });
    adminToken = await createAndAuthUser(
      "getid.admin@example.com",
      "Password123!",
    );

    const target = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "getid.target@example.com", password: "Password123!" });
    targetId = target.body._id;
  });

  it("returns 200 and user data for admin", async () => {
    const res = await request(app)
      .get(`${BASE}/${targetId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(targetId);
    expect(res.body.email).toBe("getid.target@example.com");
    expect(res.body.password_hash).toBeUndefined();
  });

  it("returns 404 for non-existent ID", async () => {
    const res = await request(app)
      .get(`${BASE}/000000000000000000000000`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 403 for non-admin", async () => {
    const userToken = await createAndAuthUser(
      "getid.regular@example.com",
      "Password123!",
    );

    const res = await request(app)
      .get(`${BASE}/${targetId}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});

// ─── PUT /:id (admin update user) ─────────────────────────────────────────────

describe("PUT /api/v1/users/:id", () => {
  let adminToken;
  let targetId;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send({
      email: "upd.admin@example.com",
      password: "Password123!",
      user_role: "admin",
    });
    adminToken = await createAndAuthUser(
      "upd.admin@example.com",
      "Password123!",
    );

    const target = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "upd.target@example.com", password: "Password123!" });
    targetId = target.body._id;
  });

  it("updates email for admin", async () => {
    const res = await request(app)
      .put(`${BASE}/${targetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "upd.new@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("upd.new@example.com");
  });

  it("updates user_role for admin", async () => {
    const res = await request(app)
      .put(`${BASE}/${targetId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ user_role: "super user" });

    expect(res.status).toBe(200);
    expect(res.body.user_role).toBe("super user");
  });

  it("returns 404 for non-existent ID", async () => {
    const res = await request(app)
      .put(`${BASE}/000000000000000000000000`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "x@example.com" });

    expect(res.status).toBe(404);
  });

  it("returns 403 for non-admin", async () => {
    const userToken = await createAndAuthUser(
      "upd.regular@example.com",
      "Password123!",
    );

    const res = await request(app)
      .put(`${BASE}/${targetId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ email: "x@example.com" });

    expect(res.status).toBe(403);
  });
});

// ─── PUT /:id/activate ────────────────────────────────────────────────────────

describe("PUT /api/v1/users/:id/activate", () => {
  let adminToken;
  let targetId;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send({
      email: "act.admin@example.com",
      password: "Password123!",
      user_role: "admin",
    });
    adminToken = await createAndAuthUser(
      "act.admin@example.com",
      "Password123!",
    );

    const target = await request(app).post(`${BASE}/register`).send({
      email: "act.target@example.com",
      password: "Password123!",
      is_active: false,
    });
    targetId = target.body._id;
  });

  it("activates a user and returns is_active: true", async () => {
    const res = await request(app)
      .put(`${BASE}/${targetId}/activate`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(true);
  });

  it("returns 404 for non-existent ID", async () => {
    const res = await request(app)
      .put(`${BASE}/000000000000000000000000/activate`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 403 for non-admin", async () => {
    const userToken = await createAndAuthUser(
      "act.regular@example.com",
      "Password123!",
    );

    const res = await request(app)
      .put(`${BASE}/${targetId}/activate`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});

// ─── PUT /:id/deactivate ──────────────────────────────────────────────────────

describe("PUT /api/v1/users/:id/deactivate", () => {
  let adminToken;
  let targetId;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send({
      email: "deact.admin@example.com",
      password: "Password123!",
      user_role: "admin",
    });
    adminToken = await createAndAuthUser(
      "deact.admin@example.com",
      "Password123!",
    );

    const target = await request(app)
      .post(`${BASE}/register`)
      .send({ email: "deact.target@example.com", password: "Password123!" });
    targetId = target.body._id;
  });

  it("deactivates a user and returns is_active: false", async () => {
    const res = await request(app)
      .put(`${BASE}/${targetId}/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });

  it("deactivated user cannot authenticate", async () => {
    await request(app)
      .put(`${BASE}/${targetId}/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`);

    const res = await request(app)
      .post(`${BASE}/auth`)
      .send({ email: "deact.target@example.com", password: "Password123!" });

    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent ID", async () => {
    const res = await request(app)
      .put(`${BASE}/000000000000000000000000/deactivate`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it("returns 403 for non-admin", async () => {
    const userToken = await createAndAuthUser(
      "deact.regular@example.com",
      "Password123!",
    );

    const res = await request(app)
      .put(`${BASE}/${targetId}/deactivate`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("accounts cannot be permanently deleted — DELETE returns 404", async () => {
    const res = await request(app)
      .delete(`${BASE}/${targetId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    // No delete route exists — Express notFound middleware returns 404
    expect(res.status).toBe(404);
  });
});

// ─── PUT /auth/password ───────────────────────────────────────────────────

describe("PUT /api/v1/users/auth/password", () => {
  const email = "pwchange@example.com";
  const originalPassword = "Password123!";
  const newPassword = "NewSecure@456!";

  let token;

  beforeEach(async () => {
    token = await createAndAuthUser(email, originalPassword);
  });

  it("returns 200 and success message when password is changed", async () => {
    const res = await request(app)
      .put(`${BASE}/auth/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ current_password: originalPassword, new_password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password updated/i);
  });

  it("allows login with the new password after change", async () => {
    await request(app)
      .put(`${BASE}/auth/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ current_password: originalPassword, new_password: newPassword });

    const loginRes = await request(app)
      .post(`${BASE}/auth`)
      .send({ email, password: newPassword });

    expect(loginRes.status).toBe(200);
  });

  it("returns 400 when current_password is wrong", async () => {
    const res = await request(app)
      .put(`${BASE}/auth/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ current_password: "WrongPassword1!", new_password: newPassword });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/current password is incorrect/i);
  });

  it("returns 400 when current_password is missing", async () => {
    const res = await request(app)
      .put(`${BASE}/auth/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ new_password: newPassword });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("returns 400 when new_password is missing", async () => {
    const res = await request(app)
      .put(`${BASE}/auth/password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ current_password: originalPassword });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await request(app)
      .put(`${BASE}/auth/password`)
      .send({ current_password: originalPassword, new_password: newPassword });

    expect(res.status).toBe(401);
  });
});
