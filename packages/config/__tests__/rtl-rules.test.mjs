/**
 * The two RTL `no-restricted-syntax` selectors, run against known-bad source.
 *
 * Both record bugs that reached production: seven hardcoded `textAlign: "right"`
 * in shared native components, and Tailwind physical-direction utilities on an
 * Arabic-first product where `ml-4` is on the wrong side for most users.
 *
 * A rule that silently stops matching after a config migration is worse than no
 * rule — it reads as coverage and provides none. `pnpm lint` passing proves only
 * that nothing currently violates them, which is exactly what a dead rule also
 * looks like. This lints strings that SHOULD fail and asserts they do.
 *
 * Run with: node --test packages/config/__tests__/rtl-rules.test.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { Linter } from "eslint";

import { houseRules } from "../eslint-base.mjs";

const linter = new Linter();

const lint = (code) =>
  linter.verify(code, {
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    rules: { "no-restricted-syntax": houseRules["no-restricted-syntax"] },
  });

const messagesFor = (code) => lint(code).map((m) => m.message);

test('flags textAlign: "right" — RN flips it under I18nManager.isRTL', () => {
  const found = messagesFor(`const s = { textAlign: "right" };`);
  assert.equal(found.length, 1, `expected one hit, got ${JSON.stringify(found)}`);
  assert.match(found[0], /textAlign: "auto"/);
});

test('flags textAlign: "left" too', () => {
  assert.equal(messagesFor(`const s = { textAlign: "left" };`).length, 1);
});

test('allows textAlign: "auto" and "center"', () => {
  assert.equal(messagesFor(`const s = { textAlign: "auto" };`).length, 0);
  assert.equal(messagesFor(`const s = { textAlign: "center" };`).length, 0);
});

test("flags Tailwind physical-direction utilities", () => {
  for (const cls of ["ml-4", "mr-2", "pl-1", "pr-8", "text-left", "text-right"]) {
    const found = messagesFor(`const c = "flex ${cls} gap-2";`);
    assert.equal(found.length, 1, `${cls} should be flagged, got ${JSON.stringify(found)}`);
    assert.match(found[0], /logical properties/);
  }
});

test("allows the logical equivalents", () => {
  for (const cls of ["ms-4", "me-2", "ps-1", "pe-8", "text-start", "text-end"]) {
    assert.equal(messagesFor(`const c = "flex ${cls} gap-2";`).length, 0, `${cls} must pass`);
  }
});

test("both selectors are present, so neither can be dropped unnoticed", () => {
  const [severity, ...selectors] = houseRules["no-restricted-syntax"];
  assert.equal(severity, "error");
  assert.equal(selectors.length, 2);
  assert.ok(selectors.some((s) => s.selector.includes("textAlign")));
  assert.ok(selectors.some((s) => s.selector.includes("text-right")));
});
