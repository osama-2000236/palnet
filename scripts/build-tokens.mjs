#!/usr/bin/env node
// Emit packages/ui-tokens/src/tokens.css from that package's index.ts.
//
// Lives here, beside build-brand-icons.mjs, because that is where this repo
// keeps build and gate scripts — and because it imports the package's `dist/`,
// which does not exist at lint time and trips import/no-unresolved inside the
// package's own eslint scope.
//
// The header on tokens.css claimed it was generated for months while
// `tokens:build` was `tsc` and nothing generated anything — so 323 lines of hex
// were kept in step with index.ts by hand, and the file that says DO NOT EDIT
// was the only place to edit. This closes that.
//
// Reads the COMPILED tokens (`dist/index.js`), so `pnpm --filter @baydar/ui-tokens
// build` must have run first — that is exactly what `tokens:build` and
// `check:tokens` do before invoking this.
//
// `--check` re-emits into memory and diffs, so CI fails on drift instead of
// rewriting a tracked file mid-build.
//
// Not in scope: tokens.native.ts. That one is NOT derivable — RN shadows carry
// hand-picked elevations, the mobile type scale is deliberately tighter than
// web's, and font families are PostScript names. It is a real source file that
// now *references* tokens for everything mechanical instead of restating it.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { format, resolveConfig } from "prettier";

import { tokens } from "../packages/ui-tokens/dist/index.js";

const OUT = fileURLToPath(new URL("../packages/ui-tokens/src/tokens.css", import.meta.url));

const { color, dark } = tokens;

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** `brand.100` → `--brand-100`, `ink.DEFAULT` → `--ink`, `line.soft` → `--line-soft`. */
function refVar(ref) {
  const [group, key] = ref.split(".");
  return key === "DEFAULT" ? `--${group}` : `--${group}-${kebab(key)}`;
}

/** A token ref resolves to a var(); anything else (a literal hex) passes through. */
const refOrLiteral = (value) => (value.startsWith("#") ? value : `var(${refVar(value)})`);

/** `#f4f6ef` → `244 246 239` — Tailwind's alpha-capable channel form. */
function channels(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const isHex = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

/** Every colour in a palette, as [cssVarName, value]. */
function colorPairs(palette) {
  const pairs = [];
  const push = (group, entries) => {
    for (const [key, value] of Object.entries(entries ?? {})) {
      pairs.push([key === "DEFAULT" ? `--${group}` : `--${group}-${kebab(key)}`, value]);
    }
  };
  push("brand", palette.brand);
  push("accent", palette.accent);
  push("ink", palette.ink);
  push("surface", palette.surface);
  push("line", palette.line);
  push("band", palette.band);
  push("bar", palette.bar);
  push("rule", palette.rule);
  // Semantics drop the group prefix: `successSoft` → `--success-soft`.
  for (const [key, value] of Object.entries(palette.semantic ?? {})) {
    pairs.push([`--${kebab(key)}`, value]);
  }
  return pairs;
}

/**
 * Channel forms for the solid hexes only — rgba() tints have no alpha slot to
 * fill, and the switch thumb is never reached through a Tailwind alpha utility.
 */
const channelPairs = (pairs) =>
  pairs
    .filter(([name, value]) => isHex(value) && name !== "--switch-thumb")
    .map(([name, value]) => [`${name}-rgb`, channels(value)]);

const decls = (pairs) => pairs.map(([name, value]) => `  ${name}: ${value};`).join("\n");

// Hex → var(), so the one decorative gradient references the brand ramp rather
// than freezing a copy of it.
//
// FIRST writer wins, not last. Semantic groups alias ramp values by design —
// `bar.fill` IS brand-600, `bar.fillWeak` IS brand-500 — so a plain Map built
// in iteration order resolved the cover gradient's #687a3a to `--bar-fill-weak`
// the moment those two lined up. The gradient is a BRAND statement
// (DESIGN.md §13); it must not end up pointing at a progress-bar token.
//
// FIRST writer wins, not last. Semantic groups alias ramp values by design —
// `bar.fill` IS brand-600, `bar.fillWeak` IS brand-500 — so a plain Map built
// in iteration order resolved the cover gradient's #687a3a to `--bar-fill-weak`
// the moment those two lined up. The gradient is a BRAND statement
// (DESIGN.md §13); it must not end up pointing at a progress-bar token.
const brandVarByHex = new Map();
for (const [name, value] of colorPairs(color)) {
  if (!isHex(value)) continue;
  const key = value.toLowerCase();
  if (!brandVarByHex.has(key)) brandVarByHex.set(key, `var(${name})`);
}

const varifyHex = (css) =>
  css.replace(/#[0-9a-f]{6}/gi, (hex) => brandVarByHex.get(hex.toLowerCase()) ?? hex);

// `control` sits outside `color` in the light bundle and inside `dark.color`
// in the override, so it is threaded in rather than read off one palette.
const lightColors = [...colorPairs(color), ["--switch-thumb", tokens.control.switchThumb]];

const root = [
  ["Brand, accent, ink, surface, lines, semantics", lightColors],
  ["Spacing scale — px values match Tailwind preset.", spacePairs()],
  ["Stacking order — every layer draws from this, nothing hardcodes a z-index.", zPairs()],
  ["Minimum pressable size (CLAUDE.md: 44pt mobile / 40px web)", targetPairs()],
  ["State layer — one ink overlay for every interactive surface", statePairs()],
  ["Focus ring (single source)", focusPairs()],
  ["Avatar palettes", avatarPairs(tokens.avatar.palette)],
  [
    "Channel forms (space-separated R G B) for Tailwind alpha support. Tailwind maps each colour to `rgb(var(--<token>-rgb) / <alpha-value>)`, so utilities like `bg-ink/40` keep working AND the whole palette re-themes when the `.dark` scope swaps these channels.",
    channelPairs(lightColors),
  ],
  ["Radius", scalePairs(tokens.radius, "--radius-", "px")],
  ["Shadow", Object.entries(tokens.shadow).map(([k, v]) => [`--shadow-${k}`, v])],
  ["Type", Object.entries(tokens.type.family).map(([k, v]) => [`--font-${k}`, v])],
  ["Chrome", chromePairs()],
  ["Motion", motionPairs()],
  [
    "Profile cover — the single allowed decorative gradient (DESIGN.md §13).",
    [["--cover-gradient", varifyHex(color.cover.gradient)]],
  ],
  [
    "Illustration scale (EmptyState / Illustration primitive)",
    scalePairs(tokens.illustration.size, "--illus-size-", "px"),
  ],
  [
    "Illustration backdrop tints — map to existing surface tokens",
    Object.entries(tokens.illustration.tint).map(([k, v]) => [
      `--illus-tint-${k}`,
      refOrLiteral(v),
    ]),
  ],
  ["Named breakpoints. Right rail is xl-only.", scalePairs(tokens.breakpoint, "--bp-", "px")],
];

function spacePairs() {
  return Object.entries(tokens.space).map(([k, v]) => [`--space-${k}`, v === 0 ? "0" : `${v}px`]);
}
function zPairs() {
  return Object.entries(tokens.z).map(([k, v]) => [`--z-${k}`, String(v)]);
}
function targetPairs() {
  return Object.entries(tokens.target).map(([k, v]) => [`--target-${k}`, `${v}px`]);
}
function statePairs() {
  return Object.entries(tokens.state.light).map(([k, v]) => [`--state-${k}`, String(v)]);
}
function focusPairs() {
  return [
    ["--focus-ring-color", tokens.focus.color],
    ["--focus-ring-width", `${tokens.focus.width}px`],
    ["--focus-ring-offset", `${tokens.focus.offset}px`],
    ["--focus-ring", tokens.focus.ring],
  ];
}
function avatarPairs(palette) {
  return palette.flatMap((entry, i) => [
    [`--avatar-palette-${i + 1}-bg`, refOrLiteral(entry.bg)],
    [`--avatar-palette-${i + 1}-fg`, refOrLiteral(entry.fg)],
  ]);
}
function scalePairs(scale, prefix, unit) {
  return Object.entries(scale).map(([k, v]) => [`${prefix}${k}`, `${v}${unit}`]);
}
function chromePairs() {
  return [
    ["--nav-h", `${tokens.chrome.navHeight}px`],
    ["--max-w", `${tokens.chrome.maxContentWidth}px`],
    ["--mobile-tab-h", `${tokens.chrome.mobileTabHeight}px`],
  ];
}
function motionPairs() {
  return [
    ...Object.entries(tokens.motion.easing).map(([k, v]) => [`--ease-${k}`, v]),
    ...Object.entries(tokens.motion.duration).map(([k, v]) => [`--dur-${k}`, `${v}ms`]),
    ["--stagger-step", `${tokens.motion.stagger.step}ms`],
    ["--enter-rise", `${tokens.motion.enter.rise}px`],
  ];
}

// Dark redeclares only what changes; everything else inherits :root.
const darkColors = [...colorPairs(dark.color), ["--switch-thumb", dark.color.control.switchThumb]];
const lightByName = new Map(lightColors);
const darkAvatar = tokens.avatar.palette.flatMap((light, i) => {
  const over = dark.avatar.palette[i];
  return ["bg", "fg"]
    .filter((slot) => over[slot] !== light[slot])
    .map((slot) => [`--avatar-palette-${i + 1}-${slot}`, refOrLiteral(over[slot])]);
});

const darkBlock = [
  ["Brand, accent, ink, surface, lines, semantics — re-lit for the dark surface", darkColors],
  [
    "Shadow — warm-ink shadows vanish on dark; use pure black",
    Object.entries(dark.shadow).map(([k, v]) => [`--shadow-${k}`, v]),
  ],
  ["Avatar fg refs that would land dark-on-dark are re-pointed to a light depth.", darkAvatar],
  [
    "Channel forms — mirror the hex overrides above so Tailwind utilities re-theme in dark. Only the solids that change are listed.",
    channelPairs(darkColors.filter(([name, value]) => lightByName.get(name) !== value)),
  ],
];

const section = ([comment, pairs]) => (pairs.length ? `  /* ${comment} */\n${decls(pairs)}\n` : "");

const css = `/* packages/ui-tokens/src/tokens.css
 * GENERATED from index.ts by scripts/build-tokens.mjs.
 * DO NOT EDIT BY HAND — run \`pnpm tokens:build\`. CI checks for drift.
 */

:root {
${root.map(section).join("\n")}}

/* ── Warm-dark theme ────────────────────────────────────────────────────────
 * LIGHT IS THE DEFAULT — dark is opt-in: add \`.dark\` or \`[data-theme="dark"]\`
 * to a root element (e.g. <html>). Only the tokens that change are redeclared;
 * the rest inherit :root above. Tokens defined via var() refs (focus-ring,
 * cover-gradient, most avatar palettes) re-resolve automatically in this scope.
 */
.dark,
[data-theme="dark"] {
${darkBlock.map(section).join("\n")}}

/* RTL helper: flip icons that need directional mirroring.
 * DIRECTIONAL: arrows, navigation chevrons, send icons.
 * NON-DIRECTIONAL: clocks, email, padlock, magnifier, camera, numbers.
 * Apply .rtl-mirror to the FORMER only. */
[dir="rtl"] .rtl-mirror {
  /* \`scale\`, not \`transform: scaleX(-1)\`. Tailwind's rotate/translate/scale
   * utilities all compile to one \`transform\` declaration, and this selector
   * outranks a bare utility class — so \`rtl-mirror rotate-90\` silently dropped
   * the rotation and the legal-page back chevron pointed straight down in
   * Arabic. The individual \`scale\` property composes with \`transform\` instead
   * of replacing it (transform applies first, then scale). */
  scale: -1 1;
}
`;

// Formatted with the repo's own prettier config (printWidth in particular) so
// the emitted file passes `format:check` — otherwise every build leaves CI red.
const formatted = await format(css, { ...(await resolveConfig(OUT)), parser: "css" });

if (process.argv.includes("--check")) {
  const current = readFileSync(OUT, "utf8");
  if (current !== formatted) {
    console.error("tokens.css is out of date with index.ts. Run `pnpm tokens:build`.");
    process.exit(1);
  }
  console.log("tokens.css matches index.ts.");
} else {
  writeFileSync(OUT, formatted);
  console.log(`wrote ${OUT}`);
}
