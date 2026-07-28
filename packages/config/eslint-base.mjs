// Shared flat ESLint config.
//
// Replaces `eslint-preset.js`, which was an eslintrc object spread into five
// `.eslintrc.cjs` files. ESLint 8 went end of life in October 2024; 9 only reads
// flat config.
//
// Not 10: `eslint-plugin-import@2.32.0`, the latest, still declares
// `eslint: "^2 || … || ^9"`, and `eslint-config-next@15.5` caps at 9 too. 9 is
// the version this toolchain actually supports.

import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Build output and vendored code — never linted, in any package. */
export const IGNORES = [
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/.expo/**",
  "**/node_modules/**",
  "**/coverage/**",
];

/**
 * The house rules, for any package that does not bring its own framework config.
 *
 * `no-restricted-syntax` is the one to be careful with. Both selectors below
 * record real bugs that reached production, and a config migration is exactly
 * when a rule stops matching without anyone noticing —
 * `packages/config/__tests__/rtl-rules.test.mjs` runs them against known-bad
 * source so that cannot happen quietly.
 */
export const houseRules = {
  "@typescript-eslint/no-explicit-any": ["error", { ignoreRestArgs: true }],
  "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "import/order": [
    "warn",
    {
      groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
      "newlines-between": "always",
      alphabetize: { order: "asc", caseInsensitive: true },
    },
  ],
  "no-console": ["warn", { allow: ["warn", "error"] }],
  eqeqeq: ["error", "always"],
  // TypeScript already resolves and checks these, and the import plugin has to
  // parse the imported module's source to do it — which it cannot do for
  // `react-native`, producing 37 "parser.parse is not a function" errors across
  // ui-native. Two checkers for one property, one of which does not work here.
  "import/namespace": "off",
  "import/default": "off",
  "import/no-named-as-default-member": "off",
  "no-restricted-syntax": [
    "error",
    {
      // Tailwind physical-direction utilities. Arabic is the default locale, so
      // `ml-4` is on the wrong side for most of the product.
      selector: "Literal[value=/\\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)/]",
      message:
        "Use logical properties (ms-*, me-*, ps-*, pe-*, start-*, end-*, text-start, text-end) for RTL safety.",
    },
    {
      // ui-native has no config of its own and lints through this base, which is
      // how seven hardcoded `textAlign: "right"` lived in shared components. RN
      // swaps left/right under I18nManager.isRTL, so a hardcoded side renders
      // wrong in Arabic and in English. See docs/design/MOBILE.md.
      selector: 'Property[key.name="textAlign"] > Literal[value=/^(left|right)$/]',
      message: 'Use textAlign: "auto", or an explicit LTR style where the content really is LTR.',
    },
  ],
};

/**
 * @param {object} [options]
 * @param {Record<string, boolean>} [options.globals] extra globals for this package
 * @returns {import("eslint").Linter.Config[]}
 */
export function baseConfig({ globals: extraGlobals = {} } = {}) {
  return [
    { ignores: IGNORES },
    {
      // ESLint 9 turns this on by default; 8 did not. It flags ~15 genuinely
      // dead `eslint-disable` comments across the repo, but `--fix` removes them
      // destructively — it rewrote
      // `{/* eslint-disable-next-line react/no-danger */}` in a JSX tree to
      // `{ }`, deleting the comment and leaving an empty expression container.
      // Deleting dead directives is a real cleanup; it is not a config
      // migration, and it should not ride along as autofix churn in 21 files.
      linterOptions: { reportUnusedDisableDirectives: "off" },
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    prettier,
    {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        globals: { ...globals.es2022, ...globals.node, ...extraGlobals },
      },
      settings: { "import/resolver": { typescript: true, node: true } },
      rules: houseRules,
    },
    {
      // CommonJS tooling — jest configs, tailwind presets, postcss. ESLint 9
      // lints `.cjs`/`.js` by default where 8 only looked at `.js` with an
      // explicit `--ext`, so these came into scope with the flat migration.
      // They are required to use `require`.
      files: ["**/*.cjs", "**/*.config.js", "**/*.config.mjs", "**/jest.config.*"],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "import/no-anonymous-default-export": "off",
        "no-undef": "off",
      },
    },
  ];
}

export { globals };
