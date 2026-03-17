import request from "supertest";
import app from "../app.js";

const BASE = "/api/v1/settings";
const USER_BASE = "/api/v1/users";

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

// ─── GET /api/v1/settings ─────────────────────────────────────────────────────

describe("GET /api/v1/settings", () => {
  it("returns 200 without authentication", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
  });

  it("returns default org_name when no config exists", async () => {
    const res = await request(app).get(BASE);
    expect(res.body).toHaveProperty("org_name");
  });

  it("returns default primary_color when no config exists", async () => {
    const res = await request(app).get(BASE);
    expect(res.body).toHaveProperty("primary_color");
    expect(res.body.primary_color).toBe("#0d6efd");
  });

  it("returns saved values after an update", async () => {
    const token = await createAndAuthUser(
      "settings-get@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ org_name: "Test Health", primary_color: "#ff0000" });

    const res = await request(app).get(BASE);
    expect(res.status).toBe(200);
    expect(res.body.org_name).toBe("Test Health");
    expect(res.body.primary_color).toBe("#ff0000");
  });
});

// ─── PUT /api/v1/settings ─────────────────────────────────────────────────────

describe("PUT /api/v1/settings", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app)
      .put(BASE)
      .send({ org_name: "Unauthorized Org" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for user role", async () => {
    const token = await createAndAuthUser(
      "settings-user@example.com",
      "Password123!",
      "user",
    );

    const res = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ org_name: "Should Fail" });

    expect(res.status).toBe(403);
  });

  it("returns 403 for super user role", async () => {
    const token = await createAndAuthUser(
      "settings-super@example.com",
      "Password123!",
      "super user",
    );

    const res = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ org_name: "Should Fail" });

    expect(res.status).toBe(403);
  });

  it("allows admin to update org_name", async () => {
    const token = await createAndAuthUser(
      "settings-admin@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ org_name: "Acme Health" });

    expect(res.status).toBe(200);
    expect(res.body.org_name).toBe("Acme Health");
  });

  it("allows admin to update primary_color", async () => {
    const token = await createAndAuthUser(
      "settings-color@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ primary_color: "#123456" });

    expect(res.status).toBe(200);
    expect(res.body.primary_color).toBe("#123456");
  });

  it("upserts — second PUT returns updated values", async () => {
    const token = await createAndAuthUser(
      "settings-upsert@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ org_name: "First Name" });

    const res = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ org_name: "Second Name" });

    expect(res.status).toBe(200);
    expect(res.body.org_name).toBe("Second Name");
  });

  it("trims whitespace from org_name", async () => {
    const token = await createAndAuthUser(
      "settings-trim@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ org_name: "  Trimmed Org  " });

    expect(res.status).toBe(200);
    expect(res.body.org_name).toBe("Trimmed Org");
  });

  it("persists partial updates without overwriting unrelated fields", async () => {
    const token = await createAndAuthUser(
      "settings-partial@example.com",
      "Password123!",
      "admin",
    );

    await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ org_name: "Stable Org", primary_color: "#aabbcc" });

    // Update only org_name — primary_color should stay
    const res = await request(app)
      .put(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ org_name: "Updated Org" });

    expect(res.status).toBe(200);
    expect(res.body.org_name).toBe("Updated Org");
    expect(res.body.primary_color).toBe("#aabbcc");
  });
});
