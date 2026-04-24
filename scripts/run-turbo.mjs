import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const args = process.argv.slice(2);

if (args.length === 0) {
  process.stderr.write("Usage: node scripts/run-turbo.mjs <task> [-- turbo args]\n");
  process.exit(1);
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };

if (process.platform === "win32") {
  const shimDir = path.join(rootDir, "scripts", "shims");
  const pathKey =
    Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "Path";
  env[pathKey] = env[pathKey]
    ? `${shimDir}${path.delimiter}${env[pathKey]}`
    : shimDir;
}

const turboCommand = process.platform === "win32" ? "turbo.cmd" : "turbo";
const child = spawn(turboCommand, ["run", ...args], {
  cwd: rootDir,
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
