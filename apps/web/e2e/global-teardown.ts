import { readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";

import { qaRunStatePath, type QaRunState } from "./qa-run";

export default async function globalTeardown(): Promise<void> {
  const runId = await readRunId();
  if (!runId) return;

  try {
    await runPnpm([
      "--filter",
      "@baydar/db",
      "qa:cleanup",
      "--",
      `--run-id=${runId}`,
      `--confirm=${runId}`,
    ]);
  } finally {
    await rm(qaRunStatePath, { force: true });
  }
}

async function readRunId(): Promise<string | null> {
  try {
    const raw = await readFile(qaRunStatePath, "utf8");
    return (JSON.parse(raw) as QaRunState).runId;
  } catch {
    return process.env.BAYDAR_QA_RUN_ID ?? null;
  }
}

function runPnpm(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, {
      cwd: pathFromWebToRoot(),
      shell: process.platform === "win32",
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm ${args.join(" ")} exited with ${code ?? "unknown"}`));
    });
  });
}

function pathFromWebToRoot(): string {
  return process.cwd().replace(/\\apps\\web$|\/apps\/web$/, "");
}
