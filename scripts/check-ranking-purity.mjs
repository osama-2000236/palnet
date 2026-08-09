#!/usr/bin/env node
// Rule 1 — money may never buy rank.
//
// No ranking, ordering, scoring or filtering function in Baydar may take as an
// input a subscription status, a plan code, an invoice, an employer credit, a
// Karama balance, or anything derived from them.
//
// This is not a taste preference. 41.3% of Palestinian graduates are
// unemployed and roughly half of those are women; in that market, selling
// applicant visibility is extractive, and it does not convert either.
// docs/HANDOFF.md records that two such rewards once existed, debited points
// and granted nothing. They were withdrawn. They do not come back.
//
// Why a gate rather than a review rule: this exact class of defect — Karama
// minted through a hire-status toggle, a double-charged checkout — survived
// multiple code reviews and was found later by a targeted audit. A grep-level
// gate is cheap and it does not get tired.
//
// Promotions are not an exception to this, they are the alternative to it: a
// promoted item lives in a separate, visually distinct slot OUTSIDE the ranked
// set, assembled by promotions.service.ts. That file is not scanned here — and
// it may not import a ranker, which is why `promoted` is banned inside one.
//
// Exits non-zero on any hit. Prints a grep-friendly report.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, sep } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Money-shaped identifiers. Each is the name of a thing a member paid for, or
 * a flag derived from one.
 *
 * Prefix matches on the leading boundary only, the same rule check-naming.mjs
 * uses: `\bSubscription\b` would miss `SubscriptionStatus`, and a ranker that
 * reads the status is doing exactly what this bans.
 *
 * Case-insensitive, because the shape that actually appears in a service is
 * `this.prisma.subscription.findFirst(...)` — Prisma's client accessors are
 * lowercase, and a capital-letter-only gate would have watched the type import
 * while the query walked past it.
 */
const BANNED = [
  { re: /\bsubscription/i, what: "a subscription" },
  { re: /\bplanCode/i, what: "a plan" },
  { re: /\binvoice/i, what: "an invoice" },
  { re: /\bemployerCredit/i, what: "an employer credit" },
  { re: /\bkaramaBalance/i, what: "a Karama balance" },
  { re: /\bkaramaLedger/i, what: "the Karama ledger" },
  { re: /\bisPremium/i, what: "a premium flag" },
  { re: /\bpromoted\b/i, what: "a promotion — those live outside the ranked set" },
];

/**
 * What counts as a ranker: anything named for the surfaces that order things,
 * plus the shared ranking package.
 *
 * `.spec.ts` does not match `…\.service\.ts`, deliberately — a test that has to
 * construct a subscription to prove a ranker ignores it would fail this gate,
 * and the honest fix there is that the ranker never receives one.
 *
 * `jobs?` rather than `jobs`, so job-alerts.service.ts is in scope: a saved
 * alert is a stored filter over jobs, and Rule 1 covers filtering, not only
 * ordering.
 */
const RANKER_FILE = /^(?:feed|search|jobs?|matching|ranking)[\w.-]*\.service\.ts$/;
const RANKER_DIR = "packages/shared/src/ranking";

/**
 * Scorers that order people rather than posts, and so are not named for a
 * surface. The evidence score orders a candidate list; a standing orders a
 * craft directory. Both are exactly the place somebody would reach for a
 * subscription tier, and neither would be caught by the name patterns above.
 */
const RANKER_FILES = new Set([
  "packages/shared/src/evidence-score.ts",
  "packages/shared/src/standing.ts",
  "apps/api/src/modules/evidence/standing.service.ts",
]);

const SOURCE_DIRS = ["apps", "packages"];
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  ".expo",
  ".turbo",
  "coverage",
  "generated",
]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const relPath = (file) => relative(ROOT, file).split(sep).join("/");

/** True when this path is a ranker and therefore subject to Rule 1. */
export function isRanker(rel) {
  if (RANKER_FILES.has(rel)) return true;
  if (rel.startsWith(`${RANKER_DIR}/`)) return /\.tsx?$/.test(rel) && !/\.spec\.tsx?$/.test(rel);
  return RANKER_FILE.test(rel.split("/").pop() ?? "");
}

/** Everything on `line` that would let money reach a ranking decision. */
export function moneyInputs(line) {
  return BANNED.filter(({ re }) => re.test(line)).map(({ what }) => what);
}

function main() {
  const failures = [];
  let scanned = 0;

  for (const dir of SOURCE_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const rel = relPath(file);
      if (!isRanker(rel)) continue;
      scanned += 1;
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          for (const what of moneyInputs(line)) {
            failures.push(`${rel}:${i + 1}  a ranker may not read ${what}\n    ${line.trim()}`);
          }
        });
    }
  }

  if (scanned === 0) {
    console.error(
      "\ncheck:ranking-purity — matched no files. The gate is looking at nothing,\n" +
        "which is not the same as passing. Check RANKER_FILE against the tree.\n",
    );
    process.exit(1);
  }

  if (failures.length) {
    console.error(`\ncheck:ranking-purity — ${failures.length} violation(s)\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    console.error(
      "Rule 1: money may never buy rank. If this item deserves to be seen, it goes\n" +
        "in the promotions slot outside the ranked set, not into the score.\n",
    );
    process.exit(1);
  }

  console.log(`check:ranking-purity — clean. ${scanned} ranker(s) scanned.`);
}

// Only scan when run as a command, so the gate's own test can import the two
// helpers without tripping on its deliberately-bad fixtures.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
