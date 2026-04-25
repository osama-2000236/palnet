import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { z } from "zod";

const OptionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

// Boot-time env validation. The process exits on failure — never degrade silently.
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:8081"),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),
  BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),
  // R2 — optional until Sprint 2 media upload.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  // Google OAuth — optional until Sprint 1.5.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  // Transactional email — Resend (Sprint 7 accounts).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default("noreply@baydar.app"),
  EMAIL_VERIFY_URL_BASE: z.string().url().default("http://localhost:3000/verify-email"),
  PASSWORD_RESET_URL_BASE: z.string().url().default("http://localhost:3000/reset-password"),
  EMAIL_VERIFY_MOBILE_URL_BASE: z.string().url().default("baydar://auth/verify"),
  PASSWORD_RESET_MOBILE_URL_BASE: z.string().url().default("baydar://auth/reset"),
  SENTRY_DSN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  CRON_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  EXPO_ACCESS_TOKEN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  // Deprecated fallback. Keep until old envs are rotated.
  MOBILE_APP_SCHEME: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]*$/)
    .optional(),
  // Optional persistent throttling. Local/dev stays in-memory when absent.
  REDIS_URL: OptionalUrl,
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== "production") return;

  const required: Array<keyof typeof env> = [
    "RESEND_API_KEY",
    "R2_ACCOUNT_ID",
    "R2_BUCKET",
    "R2_PUBLIC_URL",
    "CRON_SECRET",
    "SENTRY_DSN",
  ];

  for (const key of required) {
    if (!env[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required in production.`,
      });
    }
  }
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  loadRootEnvLocal();
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("[env] invalid configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

function loadRootEnvLocal(): void {
  const path = findRootEnvLocal();
  if (!path) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function findRootEnvLocal(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const envPath = resolve(dir, ".env.local");
    if (existsSync(resolve(dir, "pnpm-workspace.yaml")) && existsSync(envPath)) {
      return envPath;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const fallbacks = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "..", ".env.local"),
    resolve(process.cwd(), "..", "..", ".env.local"),
  ];

  return fallbacks.find((path) => existsSync(path)) ?? null;
}

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
  if (!match) return null;

  const key = match[1]!;
  let value = match[2]!.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value.replace(/\\n/g, "\n")];
}
