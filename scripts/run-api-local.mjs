import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const envFile = resolve(root, process.argv[2] ?? ".env.local");
const fileEnv = existsSync(envFile) ? parseEnvFile(readFileSync(envFile, "utf8")) : {};
const env = cleanSpawnEnv({ ...process.env, ...fileEnv });
const required = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
const missing = required.filter((key) => !env[key]?.trim());

if (missing.length > 0) {
  if (!existsSync(envFile)) {
    console.error(`[api:dev:local] Missing ${envFile}. Copy .env.example to .env.local first.`);
  }
  console.error(`[api:dev:local] Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

if (!env.API_PORT) env.API_PORT = "4000";
if (!env.CORS_ORIGINS) {
  env.CORS_ORIGINS = "http://localhost:3000,http://localhost:8081,http://localhost:8082";
}

const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "pnpm --filter @baydar/api dev"]
    : ["--filter", "@baydar/api", "dev"];
const child = spawn(command, args, {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

function parseEnvFile(contents) {
  const out = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    out[key] = unquoteEnvValue(rawValue.trim());
  }
  return out;
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "");
}

function cleanSpawnEnv(input) {
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (!key || key.includes("=") || value === undefined) continue;
    out[key] = String(value);
  }
  return out;
}
