import { z } from "zod";

// Boot-time env validation. The process exits on failure — never degrade silently.
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000,http://localhost:8081,http://localhost:8082"),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(2_592_000),
  BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),
  BAYDAR_DEV_RATE_LIMIT: z.coerce.number().int().positive().optional(),
  BAYDAR_DEV_AUTH_RATE_LIMIT: z.coerce.number().int().positive().optional(),
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
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    failEnv(parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;

  if (data.NODE_ENV === "production") {
    const rawCorsOrigins = process.env.CORS_ORIGINS;
    const origins = rawCorsOrigins
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!origins || origins.length === 0) {
      failEnv({ CORS_ORIGINS: ["CORS_ORIGINS is required in production."] });
    }
    if (origins.includes("*")) {
      failEnv({ CORS_ORIGINS: ["Wildcard CORS origins are forbidden in production."] });
    }
  }

  return data;
}

function failEnv(errors: Record<string, string[] | undefined>): never {
  // eslint-disable-next-line no-console
  console.error("[env] invalid configuration:", errors);
  process.exit(1);
}
