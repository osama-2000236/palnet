#!/usr/bin/env node
// Naming-spine gate — docs/design/OCCUPATIONS.md §0.
//
// The occupation platform introduces Occupation, Standing, WorkProof, Licence
// and Vouch next to an existing Experience, ProfileSkill.endorsements and
// Karama. Eight concepts that all sound like "how good is this person", and the
// documented failure mode is four names for one idea: "craft rank" in the API,
// "level" in the UI, "tier" in a test, `WorkRecord` beside `WorkProof`.
//
// The rule is one concept, one word, identical in Prisma, Zod, REST, i18n and
// both UI kits. This freezes that: a banned synonym in source fails here, in
// the same commit that introduced it.
//
// Deliberately narrow. Words like "level" and "badge" have legitimate unrelated
// uses (log levels, heading levels), so this matches domain-specific
// identifiers, not English words. A broad gate that cries wolf gets disabled,
// which is worse than no gate.
//
// Exits non-zero on any hit. Prints a grep-friendly report.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, sep } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * Identifier patterns that mean a concept already has a canonical name.
 *
 * Prefix matches, not `\b`-terminated: `_` and a capital are both word
 * characters, so `\bCRAFT_RANK\b` misses `CRAFT_RANK_MAX` and `\bcraftRank\b`
 * misses `craftRankOf`. The gate's own test covers exactly that.
 */
const BANNED_IDENTIFIERS = [
  { re: /\bcraftRank|\bCraftRank|\bCRAFT_RANK/, use: "Standing" },
  { re: /\bcraftLevel|\bCraftLevel|\bCRAFT_LEVEL/, use: "Standing" },
  { re: /\boccupationTier|\bstandingTier|\bStandingTier/, use: "Standing" },
  {
    re: /\bstandingBadge\b|\bStandingBadge\b/,
    use: "Standing (a badge is a rendering, not the concept)",
  },
  { re: /\bWorkRecord\b|\bworkRecord\b/, use: "WorkProof" },
  { re: /\bJobProof\b|\bjobProof\b/, use: "WorkProof" },
  { re: /\bPS_CRAFTS\b/, use: "PS_OCCUPATIONS" },
  { re: /\bnormalizeCraft\b/, use: "normalizeOccupation" },
  { re: /\bCraftFamily\b|\bcraftFamily\b/, use: "PsOccupationFamily / family" },
  {
    re: /\bcertifiedCraftsman\b|\bverifiedCraftsman\b/,
    use: "Standing, and never the word certified",
  },

  // Rule 1 — money may never buy rank. These three named the features that
  // would have sold it. APPLICATION_BOOST was a live enum member with no writer
  // and no reader; the other two were rewards that debited points and granted
  // nothing, and were withdrawn. All three are permanently unbuildable, so the
  // names are banned rather than left lying around for someone to implement.
  //
  // A LEADING `\b` and no trailing one, for two different reasons. Leading,
  // because `_` is a word character and so the pattern cannot match inside
  // REDEEM_BOOST_APPLICATION or REDEEM_FEATURED_PROFILE — the two KaramaReason
  // members that stay so historical ledger rows still render. No trailing,
  // because that is the same prefix-match rule the identifiers above use, and
  // FEATURED_PROFILE_7D was the real reward's real name.
  {
    re: /\bAPPLICATION_BOOST|\bapplicationBoost/,
    use: "nothing — an application boost is money buying rank (Rule 1)",
  },
  {
    re: /\bBOOST_APPLICATION|\bboostApplication/,
    use: "nothing — withdrawn reward, unbuildable under Rule 1",
  },
  {
    re: /\bFEATURED_PROFILE|\bfeaturedProfile/,
    use: "nothing — withdrawn reward, unbuildable under Rule 1",
  },
];

/**
 * Copy that claims a qualification Baydar has not verified. Banned only inside
 * the namespaces this platform owns — «المحترفين» in landing copy is ordinary
 * prose and stays. A licence claim is a legal exposure, not a wording
 * preference; موثّق is reserved for identity verification.
 */
const OWNED_NAMESPACES = ["occupations", "matching", "standing", "workProof"];
const BANNED_COPY = [
  { word: "معتمد", why: "implies certification Baydar does not issue" },
  { word: "مرخّص", why: "implies a licence; only a VERIFIED Licence may say this" },
  { word: "مرخص", why: "implies a licence; only a VERIFIED Licence may say this" },
  { word: "أسطى", why: "Egyptian; 0 occurrences in the official classification" },
  { word: "فني أول", why: "Gulf HR grade; 0 occurrences in the official classification" },
  { word: "خبير", why: "title inflation with nothing behind it" },
];

/** Known exceptions. Every entry needs a reason; a stale entry fails the gate. */
const LEDGER = [
  {
    file: "docs/design/OCCUPATIONS.md",
    reason: "the decision record names the banned words in order to ban them",
  },
  {
    file: "docs/NEXT-SESSION-PROMPT.md",
    reason: "same — carries the reasoning that stops someone reintroducing them",
  },
  {
    file: "scripts/check-naming.mjs",
    reason: "this gate lists what it bans",
  },
  {
    file: "packages/shared/src/occupations.spec.ts",
    reason: "asserts the banned vocabulary is absent from the taxonomy",
  },
  {
    file: "scripts/__tests__/check-naming.test.mjs",
    reason: "breaks this gate on purpose; its fixtures are the banned names",
  },
  {
    file: "packages/shared/src/schemas/karama.ts",
    reason:
      "names the two withdrawn rewards in order to record why they are gone; the enum members it keeps are the historical ledger, not a plan",
  },
];

const SOURCE_DIRS = ["apps", "packages", "scripts"];
const SOURCE_EXT = [".ts", ".tsx", ".mjs", ".js", ".prisma"];
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
    else if (SOURCE_EXT.some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

function relPath(file) {
  return relative(ROOT, file).split(sep).join("/");
}

/**
 * Every banned identifier on `line`, with what to use instead. Exported so the
 * gate can be broken on purpose — see scripts/__tests__/check-naming.test.mjs.
 */
export function bannedNames(line) {
  return BANNED_IDENTIFIERS.filter(({ re }) => re.test(line)).map(({ use }) => use);
}

/**
 * Banned copy in a catalog entry, or `[]`. Only entries under a namespace this
 * platform owns are checked: «المحترفين» in landing copy is ordinary prose.
 */
export function bannedCopy(key, text) {
  const owned = OWNED_NAMESPACES.some((ns) => key === ns || key.startsWith(`${ns}.`));
  if (!owned) return [];
  return BANNED_COPY.filter(({ word }) => text.includes(word));
}

const CATALOGS = [
  "apps/web/messages/ar-PS.json",
  "apps/web/messages/en.json",
  "apps/mobile/src/i18n/ar.json",
  "apps/mobile/src/i18n/en.json",
];

function flatten(value, prefix, out) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (typeof value === "string") {
    out.push([prefix, value]);
  }
  return out;
}

function main() {
  const ledgerFiles = new Set(LEDGER.map((l) => l.file));
  const failures = [];

  // ── 1. Banned identifiers in source ──────────────────────────────────────
  for (const dir of SOURCE_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const rel = relPath(file);
      if (ledgerFiles.has(rel)) continue;
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        for (const use of bannedNames(line)) {
          failures.push(`${rel}:${i + 1}  banned name — use ${use}\n    ${line.trim()}`);
        }
      });
    }
  }

  // ── 2. Banned copy inside the namespaces this platform owns ──────────────
  for (const catalog of CATALOGS) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(ROOT, catalog), "utf8"));
    } catch {
      continue; // a missing catalog is check:i18n's problem, not this gate's
    }
    for (const [key, text] of flatten(parsed, "", [])) {
      for (const { word, why } of bannedCopy(key, text)) {
        failures.push(`${catalog}  ${key}\n    "${word}" — ${why}`);
      }
    }
  }

  // ── 3. Stale ledger entries ──────────────────────────────────────────────
  for (const entry of LEDGER) {
    try {
      statSync(join(ROOT, entry.file));
    } catch {
      failures.push(
        `ledger entry points at a file that no longer exists: ${entry.file}\n    remove it from scripts/check-naming.mjs`,
      );
    }
  }

  if (failures.length) {
    console.error(`\ncheck:naming — ${failures.length} violation(s)\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    console.error("The naming spine is docs/design/OCCUPATIONS.md §0. One concept, one word.\n");
    process.exit(1);
  }

  console.log("check:naming — clean");
}

// Only scan when run as a command. Importing this module — which the gate's own
// test does — must not trip the gate on the test's deliberately-bad fixtures.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
