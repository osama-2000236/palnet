const nextJest = require("next/jest");

// next/jest wires up SWC + tsconfig path aliases + Next's CSS/font transforms
// so plain `.ts` and `.tsx` files Just Work in Jest without us pulling in
// ts-jest or @swc/jest as a separate devDep.
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: "jsdom",
  // Playwright e2e specs live in ./e2e and are run by `pnpm e2e`, not Jest.
  testPathIgnorePatterns: ["/node_modules/", "/e2e/", "/.next/"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  passWithNoTests: true,
};

module.exports = createJestConfig(customConfig);
