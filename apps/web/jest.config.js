/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  // Playwright e2e specs live in ./e2e and are run by `pnpm e2e`, not Jest.
  testPathIgnorePatterns: ["/node_modules/", "/e2e/", "/.next/"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts?(x)"],
  passWithNoTests: true,
};
