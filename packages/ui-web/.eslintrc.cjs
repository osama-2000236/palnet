/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: {
    browser: true,
    es2022: true,
  },
  rules: {
    "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "Literal[value=/\\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)/]",
        message:
          "Use logical properties (ms-*, me-*, ps-*, pe-*, start-*, end-*, text-start, text-end) for RTL safety.",
      },
    ],
  },
  ignorePatterns: ["dist/", ".turbo/", "node_modules/"],
};
