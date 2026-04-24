import type { ConfigService } from "@nestjs/config";

import type { Env } from "./env";

type NumericEnvKey = "BCRYPT_COST" | "JWT_ACCESS_TTL" | "JWT_REFRESH_TTL";

export function getNumberEnv(config: ConfigService<Env, true>, key: NumericEnvKey): number {
  const value = config.getOrThrow<number | string>(key);
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric configuration for ${key}.`);
  }

  return parsed;
}
