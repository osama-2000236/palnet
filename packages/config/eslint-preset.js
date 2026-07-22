/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: false,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],
    "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "import/order": [
      "warn",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "no-console": ["warn", { allow: ["warn", "error"] }],
    eqeqeq: ["error", "always"],
    // ui-native has no config of its own and lints through this preset, which is
    // how seven hardcoded `textAlign: "right"` lived in shared components. RN
    // swaps left/right under I18nManager.isRTL, so a hardcoded side renders wrong
    // in Arabic and in English. See docs/design/MOBILE.md.
    "no-restricted-syntax": [
      "error",
      {
        selector: 'Property[key.name="textAlign"] > Literal[value=/^(left|right)$/]',
        message: 'Use textAlign: "auto", or an explicit LTR style where the content really is LTR.',
      },
    ],
  },
  settings: {
    "import/resolver": {
      typescript: true,
      node: true,
    },
  },
  ignorePatterns: ["dist/", "build/", ".next/", ".turbo/", "node_modules/", "coverage/"],
};
