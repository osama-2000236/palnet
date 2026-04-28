import { spawn } from "node:child_process";

const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env.CI);
const prismaArgs = ["prisma", "migrate", interactive ? "dev" : "deploy"];

if (!interactive) {
  console.log("[db] Non-interactive shell detected; running `prisma migrate deploy`.");
}

const command = process.env.npm_execpath ? process.execPath : process.platform === "win32" ? "pnpm.CMD" : "pnpm";
const args = process.env.npm_execpath
  ? [process.env.npm_execpath, "exec", ...prismaArgs]
  : ["exec", ...prismaArgs];
const child = spawn(command, args, {
  shell: false,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`[db] Prisma migrate exited with signal ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
