/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["expo"],
  rules: {
    "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],
    // The Tailwind-class selector below is inherited from ui-web. It cannot fire
    // on a React Native StyleSheet, which is how 38 hardcoded `textAlign: "right"`
    // reached production — RN swaps left/right under I18nManager.isRTL, so they
    // rendered left in Arabic. The second selector guards the native shape.
    "no-restricted-syntax": [
      "error",
      {
        selector: "Literal[value=/\\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)/]",
        message:
          "Use logical properties (ms-*, me-*, ps-*, pe-*, start-*, end-*, text-start, text-end) for RTL safety.",
      },
      {
        selector: 'Property[key.name="textAlign"] > Literal[value=/^(left|right)$/]',
        message:
          'Use textAlign: "auto". RN flips left/right under I18nManager.isRTL, so a hardcoded side is wrong in both locales. See docs/design/MOBILE.md.',
      },
    ],
  },
};
