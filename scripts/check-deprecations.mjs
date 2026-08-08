#!/usr/bin/env node
// The two-release removal ledger.
//
// Prisma migrations are irreversible in practice on a production Postgres, so
// a dropped column is a restore-from-backup. The rule is therefore: release N
// adds the replacement and dual-writes, N+1 stops reading the old symbol, N+2
// drops it. That works right up until nobody chases it, at which point the
// migration becomes permanent and the schema has two of everything.
//
// This gate chases it. It reads the ledger and fails when either half of the
// contract breaks:
//
//   1. A deprecated symbol is read somewhere its entry does not allow.
//   2. A symbol has reached its removeInRelease and is still in the tree.
//
// An entry binds only once `currentRelease` has reached its deprecatedInRelease
// — a ledger written a phase ahead of the code is a plan, not a violation.
//
// Exits non-zero on any hit. Prints a grep-friendly report.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, sep } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const LEDGER = "docs/linkedin-parity-2026-08/spec/DEPRECATIONS.json";

const SOURCE_DIRS = ["apps", "packages", "scripts"];
const SOURCE_EXT = [".ts", ".tsx", ".mjs", ".js", ".prisma", ".sql"];
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  ".expo",
  ".turbo",
  "coverage",
  "generated",
  "migrations", // applied migrations are history; they name what they removed
]);

/** `P0` → 0. Anything unparseable sorts last, so a typo fails loudly. */
function phase(release) {
  const n = /^P(\d+)$/.exec(String(release ?? ""));
  return n ? Number(n[1]) : Number.POSITIVE_INFINITY;
}

/**
 * What to grep for, given an entry. The ledger names symbols the way a human
 * would; this turns each into something findable.
 *
 * A column is read as `.field`, never as `Model.field`, so the field name is
 * the token. That is deliberately blunt: a generic name like `verified` will
 * over-match, and the honest response is a fuller allowedReadSites list rather
 * than a cleverer regex that quietly stops seeing the real reads.
 */
export function searchToken(entry) {
  const { kind, symbol } = entry;
  if (kind === "prisma-column") return symbol.split(".").pop();
  if (kind === "prisma-enum-member") return symbol.split(".").pop();
  if (kind === "api-route") return symbol.replace(/^[A-Z]+\s+/, "").replace(/:\w+/g, "");
  return symbol;
}

/** Filesystem-shaped entries are checked by existence, not by grep. */
const isPathKind = (kind) => kind === "doc" || kind === "doc-tree";

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

const relPath = (file) => relative(ROOT, file).split(sep).join("/");

function main() {
  const ledger = JSON.parse(readFileSync(join(ROOT, LEDGER), "utf8"));
  const current = phase(ledger.currentRelease);
  if (!Number.isFinite(current)) {
    console.error(`\ncheck:deprecations — ${LEDGER} has no readable currentRelease.\n`);
    process.exit(1);
  }

  const active = ledger.deprecations.filter((d) => current >= phase(d.deprecatedInRelease));
  const failures = [];

  // Read every source file once; the ledger is small and the tree is not.
  const sources = SOURCE_DIRS.flatMap((dir) => walk(join(ROOT, dir))).map((file) => ({
    rel: relPath(file),
    lines: readFileSync(file, "utf8").split(/\r?\n/),
  }));

  for (const entry of active) {
    const due = current >= phase(entry.removeInRelease);
    const allowed = new Set(entry.allowedReadSites ?? []);

    if (isPathKind(entry.kind)) {
      if (due && existsSync(join(ROOT, entry.symbol))) {
        failures.push(
          `${entry.symbol} — due for removal in ${entry.removeInRelease} and still present.\n` +
            `    Move it to ${entry.replacement}.`,
        );
      }
      continue;
    }

    if (entry.kind === "source-block") {
      // "path/to/file.tsx <needle>" — the block is named by the token that
      // marks it, because a block has no identifier to grep for.
      const cut = entry.symbol.lastIndexOf(" ");
      const path = entry.symbol.slice(0, cut);
      const needle = entry.symbol.slice(cut + 1);
      const found = sources.find((s) => s.rel === path);
      if (due && found?.lines.some((l) => l.includes(needle))) {
        failures.push(
          `${path} still contains "${needle}", due for removal in ${entry.removeInRelease}.\n` +
            `    Replaced by ${entry.replacement}.`,
        );
      }
      continue;
    }

    const token = searchToken(entry);
    const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}`);
    const sites = [];
    for (const { rel, lines } of sources) {
      if (allowed.has(rel)) continue;
      lines.forEach((line, i) => {
        if (re.test(line)) sites.push({ rel, line: i + 1, text: line.trim() });
      });
    }

    if (due && sites.length > 0) {
      failures.push(
        `${entry.symbol} — removeInRelease ${entry.removeInRelease} has passed and ` +
          `${sites.length} reference(s) remain:\n` +
          sites.map((s) => `      ${s.rel}:${s.line}  ${s.text}`).join("\n"),
      );
    } else if (!due && sites.length > 0) {
      failures.push(
        `${entry.symbol} — deprecated in ${entry.deprecatedInRelease}, read outside ` +
          `allowedReadSites:\n` +
          sites.map((s) => `      ${s.rel}:${s.line}  ${s.text}`).join("\n") +
          `\n    Use ${entry.replacement ?? "nothing — this symbol has no replacement"}, ` +
          `or add the site to the ledger with a reason.`,
      );
    }
  }

  if (failures.length) {
    console.error(`\ncheck:deprecations — ${failures.length} violation(s)\n`);
    for (const f of failures) console.error(`  ${f}\n`);
    console.error(`Ledger: ${LEDGER} (currentRelease ${ledger.currentRelease}).\n`);
    process.exit(1);
  }

  console.log(
    `check:deprecations — clean. ${active.length} of ${ledger.deprecations.length} ` +
      `entries binding at ${ledger.currentRelease}.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
