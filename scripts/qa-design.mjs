import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import { hardcodedColors } from "./hardcoded-color.mjs";

const tracked = execSync("git ls-files", { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((file) => file.replace(/\\/g, "/"));

const sourceFiles = tracked.filter((file) => /\.(?:ts|tsx|js|jsx|css|svg|xml)$/.test(file));

const allowedColorPaths = [
  /^packages\/ui-tokens\//,
  /^apps\/mobile\/app\.config\.js$/,
  /^apps\/mobile\/assets\/source\//,
  /^apps\/mobile\/android\//,
  /^docs\/_archive\//,
  /__snapshots__\//,
  // Design-sync preview fixtures: placeholder imagery is inline SVG data URIs,
  // which can't read CSS vars. Never shipped in the app bundle.
  /^\.design-sync\//,
];

const legacyOversizeAllowlist = new Set([
  "apps/api/src/modules/billing/billing.service.ts",
  "apps/api/src/modules/companies/companies.service.ts",
  "apps/api/src/modules/connections/connections.service.ts",
  "apps/api/src/modules/karama/karama.service.ts",
  "apps/api/src/modules/messaging/messaging.service.ts",
  "apps/api/src/modules/notifications/notifications.service.ts",
  "apps/api/src/modules/profiles/profiles.service.ts",
  "apps/api/src/modules/search/search.service.ts",
  "apps/api/src/modules/auth/auth-tokens.service.ts",
  "packages/db/prisma/qa-load-fixture.ts",
  "packages/db/prisma/seed.ts",
]);

// Not legacy, and not code the 300-LOC rule is aimed at: these two are the
// token TABLES. The cap exists to stop screens and services sprawling; a flat
// list of design values gets longer every time the system gains a token, and
// splitting it would put the source of truth in two files — the one thing
// `tokens.native.ts` says outright is a bug.
const dataFileAllowlist = new Set([
  "packages/ui-tokens/src/index.ts",
  "packages/ui-tokens/src/tokens.native.ts",
]);

const colorViolations = [];
const focusViolations = [];
const oversizeViolations = [];
const oversizeWarnings = [];

for (const file of sourceFiles) {
  if (file.startsWith("docs/_archive/")) continue;
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  if (!allowedColorPaths.some((pattern) => pattern.test(file))) {
    lines.forEach((line, index) => {
      const found = hardcodedColors(line);
      if (found.length > 0) {
        colorViolations.push(`${file}:${index + 1}: hard-coded hex color ${found.join(", ")}`);
      }
    });
  }

  if (/\.(?:ts|tsx)$/.test(file) && !file.includes("__tests__/")) {
    lines.forEach((line, index) => {
      if (
        line.includes("focus-visible:outline-none") &&
        !line.includes("focus-visible:[box-shadow:var(--focus-ring)]") &&
        !line.includes("focus-within:[box-shadow:var(--focus-ring)]")
      ) {
        focusViolations.push(`${file}:${index + 1}: focus outline removed without token ring`);
      }
    });
  }

  if (
    /\.(?:ts|tsx)$/.test(file) &&
    !file.includes("__tests__/") &&
    !/\.(?:spec|test)\.tsx?$/.test(file)
  ) {
    const count = lines.length;
    if (count > 300) {
      const entry = `${file}: ${count} LOC`;
      if (dataFileAllowlist.has(file) || legacyOversizeAllowlist.has(file)) {
        // Warn, never silent: an allowlisted file that doubles should still be
        // visible in CI output, or the allowlist becomes a blind spot.
        oversizeWarnings.push(entry);
      } else {
        oversizeViolations.push(entry);
      }
    }
  }
}

function printGroup(title, entries) {
  if (entries.length === 0) return;
  console.log(`\n${title}`);
  for (const entry of entries) console.log(`- ${entry}`);
}

printGroup("Design QA warnings: legacy files over 300 LOC", oversizeWarnings);
printGroup("Design QA violations: hard-coded colors", colorViolations);
printGroup("Design QA violations: focus rings", focusViolations);
printGroup("Design QA violations: files over 300 LOC", oversizeViolations);

const total = colorViolations.length + focusViolations.length + oversizeViolations.length;
if (total > 0) {
  console.error(`\nqa:design failed with ${total} violation(s).`);
  process.exit(1);
}

console.log("qa:design — clean.");
