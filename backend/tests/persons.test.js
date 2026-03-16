import request from "supertest";
import app from "../app.js";
import User from "../models/userModel.js";

const BASE = "/api/v1/persons";
const USER_BASE = "/api/v1/users";

// Helper to register and auth a user, returning the JWT token and user data
const createAndAuthUser = async (email, password, role = "user") => {
  const registerRes = await request(app)
    .post(`${USER_BASE}/register`)
    .send({ email, password, user_role: role });

  const authRes = await request(app)
    .post(`${USER_BASE}/auth`)
    .send({ email, password });

  const cookie = authRes.headers["set-cookie"];
  const token = cookie?.[0]?.match(/jwt=([^;]+)/)?.[1];

  return { token, userId: registerRes.body._id, user: registerRes.body };
};

// Helper to create a complete person record
const createPersonData = (user_id, overrides = {}) => ({
  user_id,
  first_name: "John",
  last_name: "Doe",
  ...overrides,
});

// ─── POST /api/v1/persons ────────────────────────────────────────────────────

describe("POST /api/v1/persons", () => {
  it("should create a new person and return 201", async () => {
    const { token, userId } = await createAndAuthUser(
      "person1@example.com",
      "Password123!",
    );

    const personData = createPersonData(userId, {
      middle_name: "Michael",
      suffix: "Jr.",
    });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(personData);

    expect(res.status).toBe(201);
    expect(res.body.first_name).toBe("John");
    expect(res.body.middle_name).toBe("Michael");
    expect(res.body.last_name).toBe("Doe");
    expect(res.body.suffix).toBe("Jr.");
    expect(res.body.user_id).toBe(userId);
    expect(res.body.is_active).toBe(true);
  });

  it("should return 404 if user_id does not exist", async () => {
    const { token } = await createAndAuthUser(
      "nouser@example.com",
      "Password123!",
    );

    const personData = createPersonData("507f1f77bcf86cd799439011");

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(personData);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/user not found/i);
  });

  it("should return 400 if person already exists for user_id", async () => {
    const { token, userId } = await createAndAuthUser(
      "duplicate@example.com",
      "Password123!",
    );

    const personData = createPersonData(userId);

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(personData);

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(personData);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/person record already exists/i);
  });

  it("should return 400 if required fields are missing", async () => {
    const { token, userId } = await createAndAuthUser(
      "missing@example.com",
      "Password123!",
    );

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send({ user_id: userId });

    expect(res.status).toBe(400);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).post(BASE).send({});
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/persons ─────────────────────────────────────────────────────

describe("GET /api/v1/persons", () => {
  it("should return all persons for admin", async () => {
    const { token: adminToken, userId: userId1 } = await createAndAuthUser(
      "get1@example.com",
      "Password123!",
      "admin",
    );
    const { token: token2, userId: userId2 } = await createAndAuthUser(
      "get2@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(createPersonData(userId1, { first_name: "Alice" }));

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(createPersonData(userId2, { first_name: "Bob" }));

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should return all persons for super user", async () => {
    const { token: superToken, userId } = await createAndAuthUser(
      "get.super@example.com",
      "Password123!",
      "super user",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${superToken}`)
      .send(createPersonData(userId, { first_name: "SuperViewer" }));

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${superToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("should return 403 for regular user", async () => {
    const { token: userToken } = await createAndAuthUser(
      "get.user403@example.com",
      "Password123!",
      "user",
    );

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("should filter persons by is_active status", async () => {
    const { token: adminToken } = await createAndAuthUser(
      "active.admin@example.com",
      "Password123!",
      "admin",
    );
    const { userId: userId1 } = await createAndAuthUser(
      "active1@example.com",
      "Password123!",
    );
    const { userId: userId2 } = await createAndAuthUser(
      "active2@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(createPersonData(userId1, { is_active: true }));

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(createPersonData(userId2, { is_active: false }));

    const res = await request(app)
      .get(`${BASE}?is_active=false`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].is_active).toBe(false);
  });

  it("should search persons by name", async () => {
    const { token: adminToken } = await createAndAuthUser(
      "search.admin@example.com",
      "Password123!",
      "admin",
    );
    const { userId: userId1 } = await createAndAuthUser(
      "search1@example.com",
      "Password123!",
    );
    const { userId: userId2 } = await createAndAuthUser(
      "search2@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(
        createPersonData(userId1, { first_name: "Alice", last_name: "Smith" }),
      );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(
        createPersonData(userId2, { first_name: "Bob", last_name: "Jones" }),
      );

    const res = await request(app)
      .get(`${BASE}?search=Alice`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].first_name).toBe("Alice");
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/persons/:id ─────────────────────────────────────────────────

describe("GET /api/v1/persons/:id", () => {
  it("should return a person by ID for admin", async () => {
    const { token: adminToken } = await createAndAuthUser(
      "getid.admin@example.com",
      "Password123!",
      "admin",
    );
    const { userId } = await createAndAuthUser(
      "getid.target@example.com",
      "Password123!",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(createPersonData(userId));

    const personId = createRes.body._id;

    const res = await request(app)
      .get(`${BASE}/${personId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(personId);
    expect(res.body.first_name).toBe("John");
  });

  it("should return a person by ID for super user", async () => {
    const { token: superToken } = await createAndAuthUser(
      "getid.super@example.com",
      "Password123!",
      "super user",
    );
    const { userId } = await createAndAuthUser(
      "getid.super.target@example.com",
      "Password123!",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${superToken}`)
      .send(createPersonData(userId));

    const personId = createRes.body._id;

    const res = await request(app)
      .get(`${BASE}/${personId}`)
      .set("Authorization", `Bearer ${superToken}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(personId);
  });

  it("should return 403 for regular user", async () => {
    const { token: adminToken } = await createAndAuthUser(
      "getid.admin2@example.com",
      "Password123!",
      "admin",
    );
    const { token: userToken, userId } = await createAndAuthUser(
      "getid.user403@example.com",
      "Password123!",
      "user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(createPersonData(userId));

    const res = await request(app)
      .get(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 if person not found", async () => {
    const { token: adminToken } = await createAndAuthUser(
      "notfound.admin@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .get(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/person not found/i);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(`${BASE}/507f1f77bcf86cd799439011`);
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/persons/user/:userId ────────────────────────────────────────

describe("GET /api/v1/persons/user/:userId", () => {
  it("should return a person by user_id", async () => {
    const { token, userId } = await createAndAuthUser(
      "getuserid@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(createPersonData(userId, { first_name: "Jane" }));

    const res = await request(app)
      .get(`${BASE}/user/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user_id._id).toBe(userId);
    expect(res.body.first_name).toBe("Jane");
  });

  it("should return 404 if person not found for user_id", async () => {
    const { token } = await createAndAuthUser(
      "noperson@example.com",
      "Password123!",
    );

    const res = await request(app)
      .get(`${BASE}/user/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/person not found/i);
  });
});

// ─── PUT /api/v1/persons/:id ─────────────────────────────────────────────────

describe("PUT /api/v1/persons/:id", () => {
  it("should update a person for admin", async () => {
    const { token: adminToken } = await createAndAuthUser(
      "update.admin@example.com",
      "Password123!",
      "admin",
    );
    const { userId } = await createAndAuthUser(
      "update.target@example.com",
      "Password123!",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(createPersonData(userId));

    const personId = createRes.body._id;

    const res = await request(app)
      .put(`${BASE}/${personId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ first_name: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe("Updated");
  });

  it("should return 403 for super user", async () => {
    const { token: adminToken } = await createAndAuthUser(
      "update.admin2@example.com",
      "Password123!",
      "admin",
    );
    const { token: superToken, userId } = await createAndAuthUser(
      "update.super403@example.com",
      "Password123!",
      "super user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(createPersonData(userId));

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${superToken}`)
      .send({ first_name: "Blocked" });

    expect(res.status).toBe(403);
  });

  it("should return 403 for regular user", async () => {
    const { token: adminToken } = await createAndAuthUser(
      "update.admin3@example.com",
      "Password123!",
      "admin",
    );
    const { token: userToken, userId } = await createAndAuthUser(
      "update.user403@example.com",
      "Password123!",
      "user",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(createPersonData(userId));

    const res = await request(app)
      .put(`${BASE}/${createRes.body._id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ first_name: "Blocked" });

    expect(res.status).toBe(403);
  });

  it("should update person to inactive status", async () => {
    const { token: adminToken } = await createAndAuthUser(
      "deact.admin@example.com",
      "Password123!",
      "admin",
    );
    const { userId } = await createAndAuthUser(
      "deact.target@example.com",
      "Password123!",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(createPersonData(userId));

    const personId = createRes.body._id;

    const res = await request(app)
      .put(`${BASE}/${personId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });

  it("should return 404 if person not found", async () => {
    const { token: adminToken } = await createAndAuthUser(
      "updatenotfound.admin@example.com",
      "Password123!",
      "admin",
    );

    const res = await request(app)
      .put(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ first_name: "Test" });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/person not found/i);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app)
      .put(`${BASE}/507f1f77bcf86cd799439011`)
      .send({ first_name: "Test" });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/persons/profile ─────────────────────────────────────────────

describe("GET /api/v1/persons/profile", () => {
  it("should return authenticated user's person profile", async () => {
    const { token, userId } = await createAndAuthUser(
      "profile@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(createPersonData(userId, { first_name: "ProfileUser" }));

    const res = await request(app)
      .get(`${BASE}/profile`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user_id._id).toBe(userId);
    expect(res.body.first_name).toBe("ProfileUser");
  });

  it("should return 404 if person profile not found", async () => {
    const { token } = await createAndAuthUser(
      "noprofile@example.com",
      "Password123!",
    );

    const res = await request(app)
      .get(`${BASE}/profile`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/person profile not found/i);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(`${BASE}/profile`);
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/v1/persons/profile ─────────────────────────────────────────────

describe("PUT /api/v1/persons/profile", () => {
  it("should update authenticated user's person profile", async () => {
    const { token, userId } = await createAndAuthUser(
      "updateprofile@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(createPersonData(userId));

    const res = await request(app)
      .put(`${BASE}/profile`)
      .set("Authorization", `Bearer ${token}`)
      .send({ first_name: "UpdatedProfile" });

    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe("UpdatedProfile");
  });

  it("should not allow updating user_id through profile", async () => {
    const { token, userId } = await createAndAuthUser(
      "nouserid@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(createPersonData(userId));

    const res = await request(app)
      .put(`${BASE}/profile`)
      .set("Authorization", `Bearer ${token}`)
      .send({ user_id: "507f1f77bcf86cd799439011", first_name: "Test" });

    expect(res.status).toBe(200);
    expect(res.body.user_id._id).toBe(userId); // Should remain unchanged
    expect(res.body.first_name).toBe("Test");
  });

  it("should return 404 if person profile not found", async () => {
    const { token } = await createAndAuthUser(
      "noupdateprofile@example.com",
      "Password123!",
    );

    const res = await request(app)
      .put(`${BASE}/profile`)
      .set("Authorization", `Bearer ${token}`)
      .send({ first_name: "Test" });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/person profile not found/i);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app)
      .put(`${BASE}/profile`)
      .send({ first_name: "Test" });

    expect(res.status).toBe(401);
  });
});
