module.exports = {
  // Resolved by module name, not by a path into the pnpm store. What used to be
  // here — `../../node_modules/.pnpm/jest-environment-jsdom@29.7.0/node_modules/...`
  // — pinned a version inside a directory name, so any bump to
  // jest-environment-jsdom would break test discovery rather than fail loudly.
  //
  // Nothing had to be installed to fix it: jest-environment-jsdom was already a
  // direct devDependency of this package, so the plain name always resolved.
  testEnvironment: "jsdom",
  // No <rootDir> here: jest's rootDir substitution mangles the glob when the
  // checkout path contains a dot-directory (e.g. .claude worktrees), which
  // made discovery silently find zero tests. Relative pattern + no
  // passWithNoTests = discovery failure fails loud instead.
  testMatch: ["**/src/__tests__/**/*.test.js"],
};
