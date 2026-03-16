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
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({
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
    await request(app)
      .post(`${BASE}/register`)
      .send({
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
      "Password123!"
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
