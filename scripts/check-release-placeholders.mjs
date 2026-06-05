import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const productionCheck = process.argv.includes("--production");

const releaseTargets = [
  "apps/mobile/app.config.js",
  "apps/mobile/app.json",
  "apps/mobile/eas.json",
  "apps/web/public/.well-known",
  "apps/web/src/app/.well-known",
];

const forbiddenPatterns = [
  /REPLACE_WITH/gi,
  /TEAMID\.ps\.baydar\.app/gi,
  /phc_REPLACE_WITH/gi,
];

const requiredProductionEnv = [
  "EXPO_PUBLIC_EAS_PROJECT_ID",
  "EXPO_PUBLIC_SENTRY_DSN",
  "EXPO_PUBLIC_SENTRY_RELEASE",
  "EXPO_PUBLIC_POSTHOG_KEY",
  "BAYDAR_APPLE_TEAM_ID",
  "BAYDAR_ANDROID_SHA256_CERT_FINGERPRINTS",
];

const collectFiles = (target) => {
  const path = join(repoRoot, target);

  if (!existsSync(path)) {
    return [];
  }

  const stat = statSync(path);

  if (stat.isFile()) {
    return [path];
  }

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(target, entry.name);
    return collectFiles(entryPath);
  });
};

const placeholderHits = [];

for (const file of releaseTargets.flatMap(collectFiles)) {
  const contents = readFileSync(file, "utf8");

  for (const pattern of forbiddenPatterns) {
    pattern.lastIndex = 0;

    if (pattern.test(contents)) {
      placeholderHits.push(relative(repoRoot, file));
    }
  }
}

if (placeholderHits.length > 0) {
  console.error("Release placeholders found:");

  for (const file of [...new Set(placeholderHits)].sort()) {
    console.error(`- ${file}`);
  }

  process.exitCode = 1;
}

if (productionCheck) {
  const missing = requiredProductionEnv.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    console.error("Production release env is missing:");

    for (const name of missing) {
      console.error(`- ${name}`);
    }

    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(
    productionCheck
      ? "Release placeholders and production env are ready."
      : "Release placeholders are clean.",
  );
}
