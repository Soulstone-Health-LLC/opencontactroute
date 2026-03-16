import request from "supertest";
import app from "../app.js";

const BASE = "/api/v1/enums";

// ─── GET /state-abbreviations ────────────────────────────────────────────────

describe("GET /api/v1/enums/state-abbreviations", () => {
  it("should return 200 with an array of state abbreviations", async () => {
    const res = await request(app).get(`${BASE}/state-abbreviations`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("should include standard US state abbreviations", async () => {
    const res = await request(app).get(`${BASE}/state-abbreviations`);
    const states = res.body;

    expect(states).toContain("CA");
    expect(states).toContain("TX");
    expect(states).toContain("NY");
    expect(states).toContain("FL");
  });

  it("should return only 2-character string values", async () => {
    const res = await request(app).get(`${BASE}/state-abbreviations`);

    res.body.forEach((abbr) => {
      expect(typeof abbr).toBe("string");
      expect(abbr.length).toBe(2);
    });
  });
});

// ─── GET /county ─────────────────────────────────────────────────────────────

describe("GET /api/v1/enums/county", () => {
  it("should return 200 with an array of county codes", async () => {
    const res = await request(app).get(`${BASE}/county`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("should contain at least 3000 county codes", async () => {
    const res = await request(app).get(`${BASE}/county`);

    expect(res.body.length).toBeGreaterThanOrEqual(3000);
  });

  it("should return numeric string county codes", async () => {
    const res = await request(app).get(`${BASE}/county`);

    res.body.slice(0, 10).forEach((code) => {
      expect(typeof code).toBe("string");
      expect(code).toMatch(/^\d+$/);
    });
  });

  it("should include known county codes", async () => {
    const res = await request(app).get(`${BASE}/county`);

    expect(res.body).toContain("1001"); // AL Autauga
    expect(res.body).toContain("6037"); // CA Los Angeles
  });
});
