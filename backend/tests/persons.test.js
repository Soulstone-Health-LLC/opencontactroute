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
  primary_phone: "+12125551234",
  address_line1: "123 Main St",
  city: "New York",
  state: "NY",
  zip_code: "10001",
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
      credentials: "MD",
      provider_type: "Physician",
      specialty: "Cardiology",
      npi: "1234567890",
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
    expect(res.body.credentials).toBe("MD");
    expect(res.body.provider_type).toBe("Physician");
    expect(res.body.specialty).toBe("Cardiology");
    expect(res.body.npi).toBe("1234567890");
    expect(res.body.user_id).toBe(userId);
    expect(res.body.is_active).toBe(true);
  });

  it("should create a person with multiple licenses", async () => {
    const { token, userId } = await createAndAuthUser(
      "licenses@example.com",
      "Password123!",
    );

    const personData = createPersonData(userId, {
      licenses: [
        {
          license_number: "MD123456",
          license_state: "NY",
          license_type: "Medical",
          is_active: true,
        },
        {
          license_number: "MD789012",
          license_state: "NJ",
          license_type: "Medical",
          is_active: true,
        },
      ],
    });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(personData);

    expect(res.status).toBe(201);
    expect(res.body.licenses).toHaveLength(2);
    expect(res.body.licenses[0].license_number).toBe("MD123456");
    expect(res.body.licenses[0].license_state).toBe("NY");
    expect(res.body.licenses[1].license_number).toBe("MD789012");
    expect(res.body.licenses[1].license_state).toBe("NJ");
  });

  it("should create a non-provider person without professional fields", async () => {
    const { token, userId } = await createAndAuthUser(
      "admin@example.com",
      "Password123!",
    );

    const personData = createPersonData(userId, {
      provider_type: "Administrator",
    });

    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(personData);

    expect(res.status).toBe(201);
    expect(res.body.provider_type).toBe("Administrator");
    expect(res.body.npi).toBeUndefined();
    expect(res.body.specialty).toBeUndefined();
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

  it("should return 400 if NPI already exists", async () => {
    const { token: token1, userId: userId1 } = await createAndAuthUser(
      "npi1@example.com",
      "Password123!",
    );
    const { token: token2, userId: userId2 } = await createAndAuthUser(
      "npi2@example.com",
      "Password123!",
    );

    const personData1 = createPersonData(userId1, { npi: "1234567890" });
    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token1}`)
      .send(personData1);

    const personData2 = createPersonData(userId2, { npi: "1234567890" });
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token2}`)
      .send(personData2);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/npi already exists/i);
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
  it("should return all persons", async () => {
    const { token: token1, userId: userId1 } = await createAndAuthUser(
      "get1@example.com",
      "Password123!",
    );
    const { token: token2, userId: userId2 } = await createAndAuthUser(
      "get2@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token1}`)
      .send(createPersonData(userId1, { first_name: "Alice" }));

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token2}`)
      .send(createPersonData(userId2, { first_name: "Bob" }));

    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("should filter persons by provider_type", async () => {
    const { token: token1, userId: userId1 } = await createAndAuthUser(
      "filter1@example.com",
      "Password123!",
    );
    const { token: token2, userId: userId2 } = await createAndAuthUser(
      "filter2@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token1}`)
      .send(createPersonData(userId1, { provider_type: "Physician" }));

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token2}`)
      .send(createPersonData(userId2, { provider_type: "Administrator" }));

    const res = await request(app)
      .get(`${BASE}?provider_type=Physician`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].provider_type).toBe("Physician");
  });

  it("should filter persons by specialty", async () => {
    const { token: token1, userId: userId1 } = await createAndAuthUser(
      "specialty1@example.com",
      "Password123!",
    );
    const { token: token2, userId: userId2 } = await createAndAuthUser(
      "specialty2@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token1}`)
      .send(createPersonData(userId1, { specialty: "Cardiology" }));

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token2}`)
      .send(createPersonData(userId2, { specialty: "Pediatrics" }));

    const res = await request(app)
      .get(`${BASE}?specialty=Cardiology`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].specialty).toBe("Cardiology");
  });

  it("should filter persons by is_active status", async () => {
    const { token: token1, userId: userId1 } = await createAndAuthUser(
      "active1@example.com",
      "Password123!",
    );
    const { token: token2, userId: userId2 } = await createAndAuthUser(
      "active2@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token1}`)
      .send(createPersonData(userId1, { is_active: true }));

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token2}`)
      .send(createPersonData(userId2, { is_active: false }));

    const res = await request(app)
      .get(`${BASE}?is_active=false`)
      .set("Authorization", `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].is_active).toBe(false);
  });

  it("should search persons by name", async () => {
    const { token: token1, userId: userId1 } = await createAndAuthUser(
      "search1@example.com",
      "Password123!",
    );
    const { token: token2, userId: userId2 } = await createAndAuthUser(
      "search2@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token1}`)
      .send(
        createPersonData(userId1, { first_name: "Alice", last_name: "Smith" }),
      );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token2}`)
      .send(
        createPersonData(userId2, { first_name: "Bob", last_name: "Jones" }),
      );

    const res = await request(app)
      .get(`${BASE}?search=Alice`)
      .set("Authorization", `Bearer ${token1}`);

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
  it("should return a person by ID", async () => {
    const { token, userId } = await createAndAuthUser(
      "getid@example.com",
      "Password123!",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(createPersonData(userId));

    const personId = createRes.body._id;

    const res = await request(app)
      .get(`${BASE}/${personId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(personId);
    expect(res.body.first_name).toBe("John");
  });

  it("should return 404 if person not found", async () => {
    const { token } = await createAndAuthUser(
      "notfound@example.com",
      "Password123!",
    );

    const res = await request(app)
      .get(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`);

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
  it("should update a person", async () => {
    const { token, userId } = await createAndAuthUser(
      "update@example.com",
      "Password123!",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(createPersonData(userId));

    const personId = createRes.body._id;

    const res = await request(app)
      .put(`${BASE}/${personId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ first_name: "Updated", specialty: "Neurology" });

    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe("Updated");
    expect(res.body.specialty).toBe("Neurology");
  });

  it("should update person to inactive status", async () => {
    const { token, userId } = await createAndAuthUser(
      "deactivate@example.com",
      "Password123!",
    );

    const createRes = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(createPersonData(userId));

    const personId = createRes.body._id;

    const res = await request(app)
      .put(`${BASE}/${personId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);
  });

  it("should return 400 if updating to duplicate NPI", async () => {
    const { token: token1, userId: userId1 } = await createAndAuthUser(
      "npiupdate1@example.com",
      "Password123!",
    );
    const { token: token2, userId: userId2 } = await createAndAuthUser(
      "npiupdate2@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token1}`)
      .send(createPersonData(userId1, { npi: "1111111111" }));

    const createRes2 = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token2}`)
      .send(createPersonData(userId2, { npi: "2222222222" }));

    const personId2 = createRes2.body._id;

    const res = await request(app)
      .put(`${BASE}/${personId2}`)
      .set("Authorization", `Bearer ${token2}`)
      .send({ npi: "1111111111" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/npi already exists/i);
  });

  it("should return 404 if person not found", async () => {
    const { token } = await createAndAuthUser(
      "updatenotfound@example.com",
      "Password123!",
    );

    const res = await request(app)
      .put(`${BASE}/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`)
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
      .send({ first_name: "UpdatedProfile", primary_phone: "+19175551234" });

    expect(res.status).toBe(200);
    expect(res.body.first_name).toBe("UpdatedProfile");
    expect(res.body.primary_phone).toBe("+19175551234");
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

// ─── GET /api/v1/persons/search/npi/:npi ─────────────────────────────────────

describe("GET /api/v1/persons/search/npi/:npi", () => {
  it("should return person by NPI", async () => {
    const { token, userId } = await createAndAuthUser(
      "searchnpi@example.com",
      "Password123!",
    );

    await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${token}`)
      .send(
        createPersonData(userId, { npi: "9876543210", first_name: "NPITest" }),
      );

    const res = await request(app)
      .get(`${BASE}/search/npi/9876543210`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.npi).toBe("9876543210");
    expect(res.body.first_name).toBe("NPITest");
  });

  it("should return 404 if NPI not found", async () => {
    const { token } = await createAndAuthUser(
      "nonpi@example.com",
      "Password123!",
    );

    const res = await request(app)
      .get(`${BASE}/search/npi/0000000000`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/person not found/i);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get(`${BASE}/search/npi/9876543210`);
    expect(res.status).toBe(401);
  });
});
