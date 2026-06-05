import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";

import { createQaRunId, qaRunStatePath, type QaRunState } from "./qa-run";

export default async function globalSetup(): Promise<void> {
  const runId = process.env.BAYDAR_QA_RUN_ID || createQaRunId();
  process.env.BAYDAR_QA_RUN_ID = runId;

  await mkdir(dirname(qaRunStatePath), { recursive: true });
  await writeFile(qaRunStatePath, JSON.stringify({ runId } satisfies QaRunState, null, 2));
  await runPnpm(["--filter", "@baydar/db", "qa:fixture", "--", `--run-id=${runId}`]);
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
