/**
 * The removal ledger's gate, broken on purpose.
 *
 * The failure mode worth testing is not "misses a read" — it is a ledger that
 * binds too early. An entry written a phase ahead of the code describes a plan;
 * if the gate treats it as a violation, the build goes red on correct code and
 * the gate gets commented out, which is how two-release migrations become
 * permanent in the first place.
 *
 * Run with: node --test scripts/__tests__/check-deprecations.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { searchToken } from "../check-deprecations.mjs";

const ledger = JSON.parse(
  readFileSync(
    new URL("../../docs/linkedin-parity-2026-08/spec/DEPRECATIONS.json", import.meta.url),
    "utf8",
  ),
);

test("every entry names a release the gate can order", () => {
  assert.match(ledger.currentRelease, /^P\d+$/);
  for (const entry of ledger.deprecations) {
    assert.match(entry.deprecatedInRelease, /^P\d+$/, entry.symbol);
    assert.match(entry.removeInRelease, /^P\d+$/, entry.symbol);
    const from = Number(entry.deprecatedInRelease.slice(1));
    const to = Number(entry.removeInRelease.slice(1));
    assert.ok(to >= from, `${entry.symbol}: removed before it was deprecated`);
  }
});

test("every entry carries the reason it exists", () => {
  for (const entry of ledger.deprecations) {
    assert.ok(entry.reason?.length > 20, `${entry.symbol}: a ledger entry without a reason rots`);
    assert.ok(Array.isArray(entry.allowedReadSites), entry.symbol);
  }
});

test("a column is searched by its field name, not by Model.field", () => {
  // Reads look like `profile.pronouns`, never `Profile.pronouns`. Searching the
  // qualified name would find nothing and report a clean tree.
  assert.equal(searchToken({ kind: "prisma-column", symbol: "Profile.pronouns" }), "pronouns");
  // A member of some enum, deliberately not one of the real banned names —
  // check-naming.mjs bans those everywhere and it is right to.
  assert.equal(
    searchToken({ kind: "prisma-enum-member", symbol: "SomeEnum.SOME_MEMBER" }),
    "SOME_MEMBER",
  );
});

test("a route is searched without its verb or its parameters", () => {
  assert.equal(searchToken({ kind: "api-route", symbol: "GET /jobs/alerts" }), "/jobs/alerts");
  assert.equal(
    searchToken({ kind: "api-route", symbol: "DELETE /jobs/alerts/:id" }),
    "/jobs/alerts/",
  );
  assert.equal(
    searchToken({ kind: "api-route", symbol: "GET /connections/suggestions" }),
    "/connections/suggestions",
  );
});

test("a model or a doc path is searched verbatim", () => {
  assert.equal(searchToken({ kind: "prisma-model", symbol: "JobAlert" }), "JobAlert");
  assert.equal(
    searchToken({ kind: "doc", symbol: "docs/design/handoff-plan.md" }),
    "docs/design/handoff-plan.md",
  );
});
