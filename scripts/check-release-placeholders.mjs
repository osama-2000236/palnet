import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const productionCheck = process.argv.includes("--production");

// Every entry must exist — see `collectFiles`. Two used to be dead:
// `apps/mobile/app.json` (the project uses `app.config.js`) and
// `apps/web/public/.well-known` (the association files are route handlers under
// `src/app`). Both moved legitimately, but the gate could not tell that from
// "deleted", so it scanned three of five and printed "clean".
const releaseTargets = [
  "apps/mobile/app.config.js",
  "apps/mobile/eas.json",
  "apps/web/src/app/.well-known",
];

const forbiddenPatterns = [/REPLACE_WITH/gi, /TEAMID\.ps\.baydar\.app/gi, /phc_REPLACE_WITH/gi];

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

  // Hard failure. Returning [] here meant a renamed or deleted target dropped
  // out of the scan silently: the deep-link association files could vanish and
  // this gate would still report clean.
  if (!existsSync(path)) {
    throw new Error(
      `release target "${target}" does not exist — update releaseTargets or restore the file`,
    );
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
