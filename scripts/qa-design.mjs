import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const tracked = execSync("git ls-files", { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((file) => file.replace(/\\/g, "/"));

const sourceFiles = tracked.filter((file) => /\.(?:ts|tsx|js|jsx|css|svg|xml)$/.test(file));

const allowedColorPaths = [
  /^packages\/ui-tokens\//,
  /^packages\/config\/tailwind-preset\.js$/,
  /^apps\/mobile\/app\.config\.js$/,
  /^apps\/mobile\/assets\/source\//,
  /^apps\/mobile\/android\//,
  /^docs\/_archive\//,
  /__snapshots__\//,
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

const colorViolations = [];
const focusViolations = [];
const oversizeViolations = [];
const oversizeWarnings = [];

for (const file of sourceFiles) {
  if (file.startsWith("design-handoff-2026-05/")) continue;
  if (file.startsWith("docs/_archive/")) continue;
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  if (!allowedColorPaths.some((pattern) => pattern.test(file))) {
    lines.forEach((line, index) => {
      if (/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/.test(line)) {
        colorViolations.push(`${file}:${index + 1}: hard-coded hex color`);
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
      if (legacyOversizeAllowlist.has(file)) {
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
