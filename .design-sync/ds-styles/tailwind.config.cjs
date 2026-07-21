// Design-sync only: compiles the Tailwind surface that @baydar/ui-web's class
// strings reference, using the repo's real token preset. apps/web does this at
// app-build time; the DS package itself ships no CSS (tsc only), so the sync
// needs its own compiled sheet or every preview renders unstyled.
const preset = require("../../packages/ui-tokens/tailwind-preset.cjs");

// Tailwind only emits classes it finds in `content`. For apps/web that's right;
// here it isn't — the compiled sheet IS the whole styling surface handed to
// designs built from this library, and the design agent writes utilities that
// ui-web's own internals never happened to use (text-h2, shadow-modal,
// ease-spring…). Anything named in .design-sync/conventions.md must resolve, so
// the documented vocabulary is safelisted straight off the preset and can't
// drift from it.
const theme = (preset.theme && preset.theme.extend) || preset.theme || {};
const keys = (group) => Object.keys(theme[group] || {});
const colorKeys = keys("colors").flatMap((k) =>
  typeof theme.colors[k] === "object" && theme.colors[k] !== null
    ? Object.keys(theme.colors[k]).map((s) => (s === "DEFAULT" ? k : `${k}-${s}`))
    : [k],
);

const safelist = [
  ...colorKeys.flatMap((c) => [`bg-${c}`, `text-${c}`, `border-${c}`]),
  ...keys("fontSize").map((s) => `text-${s}`),
  ...keys("borderRadius").map((r) => `rounded-${r}`),
  ...keys("boxShadow").map((s) => `shadow-${s}`),
  ...keys("fontFamily").map((f) => `font-${f}`),
  ...keys("transitionDuration").map((d) => `duration-${d}`),
  ...keys("transitionTimingFunction").map((e) => `ease-${e}`),
  // Logical direction utilities — RTL.md mandates these over the physical ones,
  // so they must resolve even where ui-web's internals never used them.
  "text-start", "text-end", "border-s", "border-e", "border-t", "border-b",
  "rounded-s", "rounded-e", "float-start", "float-end",
  // Logical spacing only — RTL.md forbids the physical ml-/pr- variants.
  ...keys("spacing").flatMap((s) => [
    `p-${s}`, `px-${s}`, `py-${s}`, `ps-${s}`, `pe-${s}`, `pt-${s}`, `pb-${s}`,
    `m-${s}`, `mx-${s}`, `my-${s}`, `ms-${s}`, `me-${s}`, `mt-${s}`, `mb-${s}`,
    `gap-${s}`, `gap-x-${s}`, `gap-y-${s}`,
  ]),
];

module.exports = {
  presets: [preset],
  safelist,
  content: [
    "../../packages/ui-web/dist/**/*.js",
    "../../packages/ui-web/src/**/*.{ts,tsx}",
    "../../packages/ui-tokens/src/**/*.{ts,tsx}",
    "../previews/**/*.tsx",
  ],
  theme: { extend: {} },
  plugins: [],
};
