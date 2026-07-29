/**
 * `qa:design`'s hard-coded-colour rule, run against known-good and known-bad
 * lines.
 *
 * The rule was quietly wrong: `#120` — a pull request reference — is also a
 * valid three-digit hex triplet, so writing "closes #120" in a source comment
 * failed the design gate. A gate that fails on prose gets worked around, and a
 * gate nobody can break on purpose is not evidence of anything.
 *
 * Run with: node --test scripts/__tests__/hardcoded-color.test.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { hardcodedColors } from "../hardcoded-color.mjs";

test("flags the shapes a real colour actually takes", () => {
  // Sampled from the paths qa:design allowlists — i.e. the repo's only
  // surviving hard-coded colours, which are exactly the true positives.
  for (const line of [
    '  backgroundColor: "#ffffff",',
    '  <circle cx="32" cy="32" r="30" fill="#526030"/>',
    "  --brand-600: #526030;",
    '  50: "#f4f6ef",',
    "  .btn.primary { background: var(--brand-600); color: #fff; }",
    "  const ring = `#1a1a17`;",
    '  style={{ borderColor: "#ebe8dc" }}',
  ]) {
    assert.ok(hardcodedColors(line).length > 0, `should flag: ${line}`);
  }
});

test("does not read a PR reference as a colour", () => {
  assert.deepEqual(hardcodedColors("const note = compute(); // closes #120"), []);
  assert.deepEqual(hardcodedColors("throw new Error(`see #133`);"), []);
  // The failure this rule shipped with, verbatim.
  assert.deepEqual(hardcodedColors("  drop(); // adopted from #93 and #126"), []);
});

test("still flags a colour on a line that also cites a PR", () => {
  assert.deepEqual(hardcodedColors('  fill: "#526030", // see #120'), ["#526030"]);
});

test("leaves whole-line comments alone", () => {
  // Recording a measured colour is how design decisions get written down here.
  assert.deepEqual(hardcodedColors("// the underline measured #526030 at 2dp"), []);
  assert.deepEqual(hardcodedColors(" * ink is #1a1a17 over #faf9f5"), []);
  assert.deepEqual(hardcodedColors("<!-- brand is #526030 -->"), []);
});

test("an inline comment is not a whole-line comment", () => {
  assert.deepEqual(hardcodedColors('const c = "#fff"; // white'), ["#fff"]);
});

test("a continuation line inside a JSX block comment is prose too", () => {
  // The real failure: `{/* … */}` wraps onto a second line that starts with a
  // word, so the whole-line-comment skip cannot see it. This is what tripped
  // lint:tokens on a `#128` reference, and why the issue-reference rule is the
  // load-bearing half rather than the comment skip.
  assert.deepEqual(hardcodedColors("                  same job since #128. A switch says"), []);
});

test("six- and eight-digit all-decimal values stay colours", () => {
  // #526030 is the brand colour and every digit is decimal, so the
  // issue-reference exception has to stop at three digits.
  assert.deepEqual(hardcodedColors('  color: "#526030";'), ["#526030"]);
  assert.deepEqual(hardcodedColors('  color: "#12345678";'), ["#12345678"]);
});

test("reports every colour on the line, so the message is actionable", () => {
  assert.deepEqual(hardcodedColors('a("#fff"); b("#1a1a17");'), ["#fff", "#1a1a17"]);
});
