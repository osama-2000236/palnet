// Root config: the packages that have no framework config of their own.
//
// `packages/shared`, `packages/ui-native`, `packages/ui-tokens` and
// `packages/db` ship no config file — each runs `eslint` from its own directory
// and ESLint walks up to this one. That is why the RTL `no-restricted-syntax`
// selectors live in the shared base and not in any single package: ui-native
// inherits them from here, and it is the package they were written for.
//
// `apps/*` and `packages/ui-web` bring their own config and are not linted from
// here.
import { baseConfig, globals } from "@baydar/config/eslint-base.mjs";

export default [
  ...baseConfig({ globals: { ...globals.jest } }),
  {
    // ui-native is React Native: JSX, plus the browser-ish globals its runtime
    // provides (fetch, console, timers are already in node/es2022).
    files: ["**/*.tsx"],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
  },
  {
    // Repo tooling was never linted under the eslintrc setup either — the root
    // had no `lint` script that ran eslint directly. Not new surface to fix in
    // a config migration.
    ignores: ["scripts/**", "tools/**", "apps/**", "packages/ui-web/**", "**/*.config.*"],
  },
];
