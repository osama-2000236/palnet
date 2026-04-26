import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const requiredKeys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "NEXT_PUBLIC_API_URL",
];

const env = { ...process.env };
const loadedFiles = loadQaEnv(env);
const missing = requiredKeys.filter((key) => !env[key]);
if (missing.length > 0) {
  console.error(`[qa:web-authed] missing env keys: ${missing.join(", ")}`);
  process.exit(1);
}

assertDisposableDatabase(env.DATABASE_URL);

if (loadedFiles.length > 0) {
  console.log(`[qa:web-authed] loaded env files: ${loadedFiles.join(", ")}`);
}

const steps = [
  [
    "psql",
    ["--set", "ON_ERROR_STOP=1", databaseUrlForPsql(env.DATABASE_URL), "--command", "select 1;"],
  ],
  ["corepack", ["pnpm", "--filter", "@baydar/db", "db:status"], { allowFailure: true }],
  [
    "corepack",
    ["pnpm", "db:deploy"],
    { logFile: resolve(process.cwd(), "e2e-results", "prisma-migrate.log") },
  ],
  ["corepack", ["pnpm", "db:generate"]],
  ["corepack", ["pnpm", "db:seed"]],
  ["corepack", ["pnpm", "--filter", "@baydar/ui-tokens", "build"]],
  ["corepack", ["pnpm", "--filter", "@baydar/shared", "build"]],
  ["corepack", ["pnpm", "--filter", "@baydar/ui-web", "build"]],
  ["corepack", ["pnpm", "--filter", "@baydar/web", "e2e:a11y-authed"]],
];

for (const [cmd, args, options] of steps) {
  const result = spawnSync(cmd, args, {
    stdio: options?.logFile ? "pipe" : "inherit",
    env,
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  if (options?.logFile && result.status !== 0) {
    mkdirSync(resolve(process.cwd(), "e2e-results"), { recursive: true });
    writeFileSync(options.logFile, [result.stdout ?? "", result.stderr ?? ""].join("\n"), "utf8");
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    console.error(`[qa:web-authed] wrote migrate log: ${options.logFile}`);
  }
  if (options?.allowFailure && result.status !== 0) continue;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function loadQaEnv(target) {
  const candidates = [
    target.QA_ENV_FILE ? resolve(process.cwd(), target.QA_ENV_FILE) : null,
    resolve(process.cwd(), ".env.qa.local"),
    resolve(process.cwd(), ".env.test.local"),
    resolve(process.cwd(), ".env.local"),
  ].filter(Boolean);
  const seen = new Set();
  const loaded = [];

  for (const candidate of candidates) {
    if (seen.has(candidate) || !existsSync(candidate)) continue;
    seen.add(candidate);
    loadEnvFile(candidate, target);
    loaded.push(candidate);
  }

  return loaded;
}

function loadEnvFile(path, target) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (target[key] === undefined) target[key] = value;
  }
}

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
  if (!match) return null;

  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [match[1], value.replace(/\\n/g, "\n")];
}

function databaseUrlForPsql(value) {
  const url = new URL(value);
  url.searchParams.delete("schema");
  return url.toString();
}

function assertDisposableDatabase(value) {
  const dbName = new URL(value).pathname.replace(/^\//, "");
  if (/qa|test|ci/i.test(dbName)) return;

  console.error(
    `[qa:web-authed] refusing to run against non-QA database "${dbName}". ` +
      "Use .env.qa.local or set ALLOW_NON_QA_DATABASE=1 only for throwaway databases.",
  );
  if (env.ALLOW_NON_QA_DATABASE !== "1") process.exit(1);
}
