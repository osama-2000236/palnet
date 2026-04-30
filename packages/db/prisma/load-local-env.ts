import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { config as loadDotenv } from "dotenv";

const ENV_FILE_NAMES = [".env.local", ".env.qa.local", ".env"];

export function loadLocalEnv(): void {
  if (process.env.DATABASE_URL) {
    return;
  }

  for (const envFile of getCandidateEnvFiles()) {
    if (!existsSync(envFile)) {
      continue;
    }

    loadDotenv({ path: envFile, override: false });
    if (process.env.DATABASE_URL) {
      return;
    }
  }
}

function getCandidateEnvFiles(): string[] {
  const explicitEnvFile = process.env.BAYDAR_ENV_FILE?.trim();
  if (explicitEnvFile) {
    return [resolve(explicitEnvFile)];
  }

  const dirs: string[] = [];
  let currentDir = process.cwd();

  while (!dirs.includes(currentDir)) {
    dirs.push(currentDir);
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return dirs.flatMap((dir) => ENV_FILE_NAMES.map((fileName) => join(dir, fileName)));
}
