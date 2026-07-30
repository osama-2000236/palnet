import { spawnSync } from "node:child_process";

const profileName = process.argv[2] ?? "smoke";
const profiles = ["smoke", "baseline", "high", "spike"];

if (!profiles.includes(profileName)) {
  console.error(`Unknown load profile "${profileName}". Use: ${profiles.join(", ")}`);
  process.exit(1);
}

const target = process.env.BAYDAR_LOAD_TARGET ?? "http://localhost:4000/api/v1";
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
// `dlx`, not a root devDependency: artillery is a large install that four
// manual profiles reach for and CI never runs. Fetched on demand instead of
// sitting in every `pnpm install` on every machine and every CI job.
const result = spawnSync(
  command,
  [
    "dlx",
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
