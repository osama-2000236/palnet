module.exports = {
  testEnvironment:
    "../../node_modules/.pnpm/jest-environment-jsdom@29.7.0/node_modules/jest-environment-jsdom",
  // No <rootDir> here: jest's rootDir substitution mangles the glob when the
  // checkout path contains a dot-directory (e.g. .claude worktrees), which
  // made discovery silently find zero tests. Relative pattern + no
  // passWithNoTests = discovery failure fails loud instead.
  testMatch: ["**/src/__tests__/**/*.test.js"],
};
