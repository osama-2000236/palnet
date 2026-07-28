// `eslint-config-next@15` predates flat config and exposes no flat entrypoint,
// so `next/core-web-vitals` and `next/typescript` come through FlatCompat. It
// gains one when Next 16 lands (Phase 3); this shim goes away then.
import { FlatCompat } from "@eslint/eslintrc";

import { houseRules, IGNORES } from "@baydar/config/eslint-base.mjs";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  { ignores: [...IGNORES, "e2e/**", "next-env.d.ts", "*.config.mjs", "*.config.js"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    rules: {
      "@typescript-eslint/no-explicit-any": houseRules["@typescript-eslint/no-explicit-any"],
      // Only the Tailwind selector here: the `textAlign` one targets React
      // Native StyleSheet objects and has nothing to match in a web component.
      "no-restricted-syntax": ["error", houseRules["no-restricted-syntax"][1]],
    },
  },
];
