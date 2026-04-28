const path = require("node:path");

module.exports = {
  rootDir: "../..",
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/apps/mobile/jest-setup.ts"],
  roots: ["<rootDir>/apps/mobile/src", "<rootDir>/packages/ui-native/src"],
  testRegex: "(/__tests__/.*|(\\.|/)(test))\\.tsx?$",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/apps/mobile/src/$1",
  },
  transform: {
    "^.+\\.[jt]sx?$": ["babel-jest", { configFile: path.join(__dirname, "babel.config.js") }],
  },
  transformIgnorePatterns: [],
  collectCoverageFrom: [
    "packages/ui-native/src/**/*.{ts,tsx}",
    "!packages/ui-native/src/**/__tests__/**",
    "!packages/ui-native/src/index.ts",
    "!packages/ui-native/src/tokens.ts",
  ],
  coverageDirectory: "<rootDir>/apps/mobile/coverage",
  coverageProvider: "v8",
  coverageReporters: ["json-summary", "text"],
};
