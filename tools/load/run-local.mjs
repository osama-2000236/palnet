import { spawnSync } from "node:child_process";

const profileName = process.argv[2] ?? "smoke";
const profiles = ["smoke", "baseline", "high", "spike"];

if (!profiles.includes(profileName)) {
  console.error(`Unknown load profile "${profileName}". Use: ${profiles.join(", ")}`);
  process.exit(1);
}

const target = process.env.BAYDAR_LOAD_TARGET ?? "http://localhost:4000/api/v1";
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(
  command,
  [
    "exec",
    "artillery",
    "run",
    "tools/load/local.yml",
    "--environment",
    profileName,
    "--target",
    target,
  ],
  { stdio: "inherit", shell: process.platform === "win32" },
);

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
