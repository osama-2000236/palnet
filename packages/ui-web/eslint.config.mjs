import { baseConfig, globals } from "@baydar/config/eslint-base.mjs";

export default [
  ...baseConfig({ globals: { ...globals.browser, ...globals.jest } }),
  {
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  {
    // Tests are plain JS fixtures with their own conventions.
    ignores: ["src/**/__tests__/**"],
  },
];
