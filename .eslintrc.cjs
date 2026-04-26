const preset = require("@baydar/config/eslint-preset");

module.exports = {
  ...preset,
  root: true,
  env: {
    es2022: true,
    jest: true,
    node: true,
  },
};
