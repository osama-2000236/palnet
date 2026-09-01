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
  // Resolve @baydar/ui-tokens to its BUILD OUTPUT, not its TypeScript source.
  //
  // The package's export map offers `dist` under the `node` condition and
  // `src/*.ts` under `default`. Jest's jsdom environment asks for `browser`,
  // matches neither, and falls through to `default` — handing raw TypeScript
  // to a project with no babel config, which dies on the first `as const`.
  //
  // It never surfaced before because no source file these tests reach imported
  // ui-tokens; the suites that do go through `../../dist`, where node resolved
  // the import at runtime. `Icon.tsx` importing shared glyph geometry made a
  // source-side test the first to cross the package boundary.
  //
  // turbo's `test` task dependsOn `^build`, so dist is present by the time
  // this runs.
  moduleNameMapper: {
    "^@baydar/ui-tokens/glyphs$": "<rootDir>/../ui-tokens/dist/glyphs.js",
    "^@baydar/ui-tokens$": "<rootDir>/../ui-tokens/dist/index.js",
  },
};
