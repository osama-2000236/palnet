/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["expo"],
  rules: {
    "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "Literal[value=/\\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)/]",
        message: "Use logical properties (ms-*, me-*, ps-*, pe-*, start-*, end-*, text-start, text-end) for RTL safety.",
      },
    ],
  },
};
