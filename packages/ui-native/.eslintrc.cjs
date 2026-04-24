const preset = require("@palnet/config/eslint-preset");

module.exports = {
  ...preset,
  root: true,
  parserOptions: {
    ...preset.parserOptions,
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  env: { browser: true, es2022: true },
};
