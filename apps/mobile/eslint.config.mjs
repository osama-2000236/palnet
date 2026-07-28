// eslint-config-expo ships a flat entrypoint (`eslint-config-expo/flat`) as of
// v10, so this needs no FlatCompat shim.
import { houseRules, IGNORES } from "@baydar/config/eslint-base.mjs";
import expo from "eslint-config-expo/flat.js";

export default [
  { ignores: IGNORES },
  ...expo,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": houseRules["@typescript-eslint/no-explicit-any"],
      // Both selectors, from the shared base. The Tailwind one cannot fire on a
      // React Native StyleSheet — which is how 38 hardcoded `textAlign: "right"`
      // reached production, since RN swaps left/right under I18nManager.isRTL and
      // they rendered left in Arabic. The second selector is the one that guards
      // the native shape, and it is the reason this rule must survive any config
      // migration intact.
      "no-restricted-syntax": houseRules["no-restricted-syntax"],
    },
  },
  {
    // `native-theming.test.tsx` holds a `[string, ReactElement][]` table of
    // fixtures. React never renders that array as children, so the elements in
    // it need no `key` — jsx-key only sees "JSX inside an array literal" and
    // reports nine of them.
    files: ["src/__tests__/**"],
    rules: { "react/jsx-key": "off" },
  },
];
