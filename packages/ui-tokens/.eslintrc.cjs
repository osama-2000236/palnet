const preset = require("@palnet/config/eslint-preset");

module.exports = {
  ...preset,
  root: true,
  parserOptions: {
    ...preset.parserOptions,
    project: ["./tsconfig.json", "./tsconfig.eslint.json"],
    tsconfigRootDir: __dirname,
  },
  env: { node: true },
};
