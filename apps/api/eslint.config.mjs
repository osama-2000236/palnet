import { baseConfig, globals } from "@baydar/config/eslint-base.mjs";

export default [
  ...baseConfig({ globals: { ...globals.jest } }),
  {
    languageOptions: {
      parserOptions: { project: "./tsconfig.json", tsconfigRootDir: import.meta.dirname },
    },
  },
];
