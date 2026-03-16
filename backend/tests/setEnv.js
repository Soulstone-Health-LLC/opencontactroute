// This file runs before any modules are imported in tests,
// ensuring env vars are available when app.js/passportConfig.js are first loaded.
process.env.JWT_SECRET = "test_jwt_secret_for_testing_only";
process.env.NODE_ENV = "test";
process.env.PORT = "3001";
