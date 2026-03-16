export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["./tests/setEnv.js"],
  setupFilesAfterEnv: ["./tests/setup.js"],
};
