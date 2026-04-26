#!/usr/bin/env node
// Token lint — guards the visual system at the source layer.
//
// What it checks (see docs/design/TESTING.md §1):
//   1. No hardcoded hex colors in .ts/.tsx source.
//   2. No Tailwind default color scales (bg-blue-*, text-slate-*, ring-indigo-*, …).
//      The brand is olive (`brand-*`); accent is terracotta (`accent-*`); status
//      colors are `danger|success|warning|info`. Anything else is a bug.
//   3. No physical directional utilities — RTL must use logical (ms/me/ps/pe/start/end).
//
// Scope: apps/web/src, apps/mobile/src, packages/ui-web/src.
// Exits non-zero on any hit. Prints a grep-friendly report.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = [
  "apps/web/src",
  "apps/mobile/src",
  "apps/mobile/app",
  "packages/ui-web/src",
  "packages/ui-native/src",
];
const EXTS = new Set([".ts", ".tsx"]);

// Tailwind default palettes that must never appear. Brand-scoped names
// (brand-*, accent-*, ink-*, surface-*, line-*) are allowed.
const FORBIDDEN_PALETTES = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];
// Tailwind utilities that carry a color scale.
const COLOR_UTILS = [
  "bg",
  "text",
  "border",
  "ring",
  "fill",
  "stroke",
  "outline",
  "from",
  "to",
  "via",
  "divide",
  "placeholder",
  "decoration",
  "caret",
  "accent",
  "shadow",
];

// e.g.   bg-blue-500   text-slate-50/20   ring-indigo-600
const paletteRe = new RegExp(
  `\\b(?:${COLOR_UTILS.join("|")})-(?:${FORBIDDEN_PALETTES.join("|")})-\\d+(?:/\\d+)?\\b`,
  "g",
);

// Hex colors. Allow black/white (we're moving them to tokens too, but don't
// fail a PR over `#fff` in a throwaway comment). Strict on 6- and 8-char hex.
const hexRe = /#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b|#[0-9a-fA-F]{3}\b/g;
const rawColorFnRe = /\brgba?\(/g;
const rawSizeRe = /\b\d+(?:\.\d+)?(?:px|rem|em)\b/g;
const rawShadowRe = /\bshadow-(?!card\b|pop\b|none\b)[\w-/[\]]+/g;

// Physical directional classes. The web .eslintrc already catches these but we
// re-check here so the mobile package is covered too.
const physicalClassRe = /\b(?:ml-|mr-|pl-|pr-|left-|right-)[\w-/[\]]+|\btext-(?:left|right)\b/g;
const nativePhysicalStyleRe = /\b(?:left|right)\s*:/g;
const COMPONENT_HELPERS = new Set(["cx", "groupMessages", "tokens"]);

// Files we shouldn't scan (generated or third-party-ish).
const SKIP_FILE = (p) =>
  p.includes(`${sep}node_modules${sep}`) ||
  p.includes(`${sep}.next${sep}`) ||
  p.includes(`${sep}dist${sep}`) ||
  p.includes(`${sep}.turbo${sep}`);

// ───────────────────────────────────────────────────────────────────────────

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (SKIP_FILE(full)) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walk(full);
    } else if (EXTS.has(name.slice(name.lastIndexOf(".")))) {
      yield full;
    }
  }
}

const hits = [];

for (const scanDir of SCAN_DIRS) {
  const abs = join(ROOT, scanDir);
  for (const file of walk(abs)) {
    const src = readFileSync(file, "utf8");
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    const lines = src.split(/\r?\n/);
    lines.forEach((line, i) => {
      // Skip comments to avoid false positives on doc examples.
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

      for (const m of line.matchAll(paletteRe)) {
        hits.push({
          rel,
          line: i + 1,
          kind: "tailwind-default-palette",
          match: m[0],
          raw: line,
        });
      }
      for (const m of line.matchAll(hexRe)) {
        hits.push({
          rel,
          line: i + 1,
          kind: "hex-color",
          match: m[0],
          raw: line,
        });
      }
      if (!line.includes("${")) {
        for (const m of line.matchAll(rawColorFnRe)) {
          hits.push({
            rel,
            line: i + 1,
            kind: "raw-rgb-color",
            match: m[0],
            raw: line,
          });
        }
      }
      for (const m of line.matchAll(rawSizeRe)) {
        hits.push({
          rel,
          line: i + 1,
          kind: "raw-visual-size",
          match: m[0],
          raw: line,
        });
      }
      for (const m of line.matchAll(rawShadowRe)) {
        hits.push({
          rel,
          line: i + 1,
          kind: "raw-shadow",
          match: m[0],
          raw: line,
        });
      }
      for (const m of line.matchAll(physicalClassRe)) {
        hits.push({
          rel,
          line: i + 1,
          kind: "physical-direction",
          match: m[0],
          raw: line,
        });
      }
      if (rel.startsWith("packages/ui-native/") && !line.includes("hitSlop")) {
        for (const m of line.matchAll(nativePhysicalStyleRe)) {
          hits.push({
            rel,
            line: i + 1,
            kind: "native-physical-style",
            match: m[0],
            raw: line,
          });
        }
      }
    });
  }
}

const webComponents = componentNames("packages/ui-web/src");
const nativeComponents = componentNames("packages/ui-native/src");
for (const name of webComponents) {
  if (!nativeComponents.has(name)) {
    hits.push({
      rel: "packages/ui-web/src",
      line: 1,
      kind: "component-parity",
      match: `${name}.tsx missing in ui-native`,
      raw: name,
    });
  }
}
for (const name of nativeComponents) {
  if (!webComponents.has(name)) {
    hits.push({
      rel: "packages/ui-native/src",
      line: 1,
      kind: "component-parity",
      match: `${name}.tsx missing in ui-web`,
      raw: name,
    });
  }
}

if (hits.length === 0) {
  console.log("lint:tokens — clean.");
  process.exit(0);
}

const byKind = hits.reduce((acc, h) => {
  (acc[h.kind] ??= []).push(h);
  return acc;
}, {});

for (const [kind, list] of Object.entries(byKind)) {
  console.error(`\n✖ ${kind} — ${list.length} hit(s)`);
  for (const h of list) {
    console.error(`  ${h.rel}:${h.line}: ${h.match}`);
  }
}
console.error(`\nTotal: ${hits.length} hit(s). See docs/design/TESTING.md §1.`);
process.exit(1);

function componentNames(dir) {
  const names = new Set();
  for (const name of readdirSync(join(ROOT, dir))) {
    if (!name.endsWith(".tsx")) continue;
    const base = name.slice(0, -4);
    if (!COMPONENT_HELPERS.has(base)) names.add(base);
  }
  return names;
}
