import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { loadLocalEnv } from "./load-local-env";

describe("loadLocalEnv", () => {
  const originalCwd = process.cwd();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalEnvFile = process.env.BAYDAR_ENV_FILE;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "baydar-db-env-"));
    process.chdir(tempDir);
    delete process.env.DATABASE_URL;
    delete process.env.BAYDAR_ENV_FILE;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    restoreEnv("DATABASE_URL", originalDatabaseUrl);
    restoreEnv("BAYDAR_ENV_FILE", originalEnvFile);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("loads DATABASE_URL from an explicit env file", () => {
    const envFile = join(tempDir, "custom.env");
    writeFileSync(envFile, "DATABASE_URL=postgresql://user:pass@localhost:5432/custom\n");
    process.env.BAYDAR_ENV_FILE = envFile;

    loadLocalEnv();

    assert.equal(process.env.DATABASE_URL, "postgresql://user:pass@localhost:5432/custom");
  });

  it("does not override an existing DATABASE_URL", () => {
    process.env.DATABASE_URL = "postgresql://existing:pass@localhost:5432/db";
    process.env.BAYDAR_ENV_FILE = join(tempDir, "missing.env");

    loadLocalEnv();

    assert.equal(process.env.DATABASE_URL, "postgresql://existing:pass@localhost:5432/db");
  });

  it("discovers .env.qa.local by walking up from the current directory", () => {
    const childDir = join(tempDir, "packages", "db");
    writeFileSync(
      join(tempDir, ".env.qa.local"),
      "DATABASE_URL=postgresql://qa:pass@localhost:5432/db\n",
    );
    mkdirSync(childDir, { recursive: true });
    process.chdir(childDir);

    loadLocalEnv();

    assert.equal(process.env.DATABASE_URL, "postgresql://qa:pass@localhost:5432/db");
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
