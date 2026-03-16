import request from "supertest";
import app from "../app.js";

describe("GET /health", () => {
  it("returns 200 when healthy", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });

  it("does not require authentication", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });

  it("returns status ok when database is connected", async () => {
    const res = await request(app).get("/health");
    expect(res.body.status).toBe("ok");
  });

  it("response includes uptime as a non-negative integer", async () => {
    const res = await request(app).get("/health");
    expect(typeof res.body.uptime).toBe("number");
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("response includes checks.db", async () => {
    const res = await request(app).get("/health");
    expect(res.body.checks).toHaveProperty("db");
    expect(["ok", "error"]).toContain(res.body.checks.db);
  });

  it("db check is ok when in-memory mongo is running", async () => {
    const res = await request(app).get("/health");
    expect(res.body.checks.db).toBe("ok");
  });
});
