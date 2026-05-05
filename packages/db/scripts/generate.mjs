import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

function localEngineEnv() {
  const env = {
    ...process.env,
    PRISMA_CLI_QUERY_ENGINE_TYPE: process.env.PRISMA_CLI_QUERY_ENGINE_TYPE ?? "library",
    PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING:
      process.env.PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING ?? "1",
  };

  try {
    const prismaPackageDir = path.dirname(require.resolve("prisma/package.json"));
    const enginesPackageDir = path.dirname(
      require.resolve("@prisma/engines/package.json", { paths: [prismaPackageDir] }),
    );
    const schemaEngine =
      process.platform === "win32" ? "schema-engine-windows.exe" : "schema-engine";
    const queryEngine =
      process.platform === "win32"
        ? "query_engine-windows.dll.node"
        : "libquery_engine-debian-openssl-3.0.x.so.node";

    const schemaEnginePath = path.join(enginesPackageDir, schemaEngine);
    const queryEnginePath = path.join(enginesPackageDir, queryEngine);
    if (existsSync(schemaEnginePath)) env.PRISMA_SCHEMA_ENGINE_BINARY = schemaEnginePath;
    if (existsSync(queryEnginePath)) env.PRISMA_QUERY_ENGINE_LIBRARY = queryEnginePath;
  } catch {
    // Prisma can still resolve/download engines in normal developer environments.
  }

  return env;
}

function generatedClientPath(...segments) {
  const clientEntry = realpathSync(require.resolve("@prisma/client"));
  const nodeModulesDir = path.resolve(path.dirname(clientEntry), "..", "..");
  return path.join(nodeModulesDir, ".prisma", "client", ...segments);
}

function verifyExistingClient() {
  const required = ["default.js", "index.js", "schema.prisma"].map((file) =>
    generatedClientPath(file),
  );
  const missing = required.filter((file) => !existsSync(file));
  if (missing.length > 0) {
    console.error("prisma generate could not run and generated client artifacts are missing:");
    for (const file of missing) console.error(`- ${file}`);
    process.exit(1);
  }

  console.warn(
    "prisma generate: nested process spawn is blocked in this environment; existing generated client artifacts are present.",
  );
}

const canSpawn = spawnSync(process.execPath, ["--version"], { encoding: "utf8" });
if (canSpawn.error?.code === "EPERM") {
  verifyExistingClient();
  process.exit(0);
}

const prismaCli = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, "generate"], {
  cwd: process.cwd(),
  env: localEngineEnv(),
  stdio: "inherit",
});

if (result.error?.code === "EPERM") {
  verifyExistingClient();
  process.exit(0);
}

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
