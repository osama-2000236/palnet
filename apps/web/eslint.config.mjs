// `eslint-config-next@16` ships flat config directly, so the `FlatCompat` shim
// this file needed on Next 15 is gone. Removing it was not optional: compat
// wraps an eslintrc-shaped object, and handing it a flat config crashes with
// `TypeError: Converting circular structure to JSON`.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

import { houseRules, IGNORES } from "@baydar/config/eslint-base.mjs";

export default [
  { ignores: [...IGNORES, "e2e/**", "next-env.d.ts", "*.config.mjs", "*.config.js"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    rules: {
      "@typescript-eslint/no-explicit-any": houseRules["@typescript-eslint/no-explicit-any"],
      // Only the Tailwind selector here: the `textAlign` one targets React
      // Native StyleSheet objects and has nothing to match in a web component.
      "no-restricted-syntax": ["error", houseRules["no-restricted-syntax"][1]],

      // React Compiler rules, new in eslint-config-next@16 and shipped as
      // errors. They fire 51 times across 37 files of code that predates them:
      //
      //   react-hooks/set-state-in-effect  48
      //   react-hooks/purity                2  (Date.now() during render)
      //   react-hooks/globals               1  (a test reassigning an outer var)
      //
      // Warnings, not off — they are worth seeing, and two of them are real:
      // the online indicators in the messages inbox compute `Date.now()` at
      // render time, so the dot never actually ticks. But clearing 48
      // setState-in-effect call sites is a React refactor with render-timing
      // consequences in each one, and that is not a version bump. Fix them in
      // their own pass and put these back to `error`.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/globals": "warn",
    },
  },
];
