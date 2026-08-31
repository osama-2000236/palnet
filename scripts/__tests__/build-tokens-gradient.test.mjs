/**
 * The cover gradient must reference the BRAND ramp, not whatever semantic token
 * happens to share its hex.
 *
 * DESIGN.md §13 makes the cover gradient the one decorative gradient in the
 * system, and build-tokens.mjs rewrites its hexes to `var()` so it tracks the
 * ramp instead of freezing a copy. That rewrite is a hex → var lookup, and
 * semantic groups deliberately alias ramp values: `bar.fill` IS brand-600.
 *
 * The moment `bar.fillWeak` was re-lit to brand-500's #687a3a for contrast, a
 * last-writer-wins Map resolved the gradient to `var(--bar-fill-weak)` — the
 * brand statement silently pointing at a progress-bar token. Nothing else
 * caught it: check:tokens compares the output to the same generator.
 *
 * Run with: node --test scripts/__tests__/build-tokens-gradient.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = new URL("../..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const css = readFileSync(join(ROOT, "packages/ui-tokens/src/tokens.css"), "utf8");

const gradient = /--cover-gradient:\s*([^;]+);/.exec(css)?.[1];

test("the cover gradient is generated at all", () => {
  assert.ok(gradient, "--cover-gradient missing from tokens.css");
});

test("the cover gradient references the brand ramp, never a semantic alias", () => {
  const vars = [...gradient.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]);
  assert.ok(vars.length >= 2, `expected the gradient to use var()s, got: ${gradient}`);
  for (const name of vars) {
    assert.ok(
      name.startsWith("--brand-"),
      `--cover-gradient resolved ${name}; it must track the brand ramp (DESIGN.md §13)`,
    );
  }
});

test("no raw hex survives in the cover gradient", () => {
  assert.doesNotMatch(
    gradient,
    /#[0-9a-f]{6}/i,
    "a frozen hex copy defeats the point of varifying the gradient",
  );
});
