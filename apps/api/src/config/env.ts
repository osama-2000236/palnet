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
  // Redis — optional. When set, custom rate limiting and SSE fanout share
  // state across API instances. Unset = in-memory (single instance).
  REDIS_URL: z.string().url().optional(),
  // R2 — optional until Sprint 2 media upload.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  CLAMAV_SCAN_URL: z.string().url().optional(),
  CLOUDFLARE_IMAGES_SCAN_URL: z.string().url().optional(),
  // Mail — Resend in production, console in dev/test.
  RESEND_API_KEY: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(3).optional(),
  MAIL_REPLY_TO: z.string().email().optional(),
  // Web URL used for transactional email links (verify, reset).
  BAYDAR_WEB_URL: z.string().url().optional(),
  // Cron endpoint shared secret.
  INTERNAL_CRON_TOKEN: z.string().min(24).optional(),
  // FX — optional USD-relative rate feed ({ rates: { ILS: 3.6, ... } }).
  // Unset = hardcoded snapshot in billing/currency.ts (acceptable for beta).
  FX_FEED_URL: z.string().url().optional(),
  // Billing — HyperPay cards + manual bank transfer.
  HYPERPAY_ENTITY_ID: z.string().optional(),
  HYPERPAY_ACCESS_TOKEN: z.string().optional(),
  HYPERPAY_WEBHOOK_SECRET: z.string().optional(),
  HYPERPAY_BASE_URL: z.string().url().optional(),
  BANK_TRANSFER_IBAN: z.string().optional(),
  BANK_TRANSFER_BENEFICIARY: z.string().optional(),
  // Local-wallet providers (Palestinian market). All optional — wallet
  // checkout stays in "Coming soon" mode until a merchant_id + api_key pair
  // is set for at least one provider. Webhook-secret / base-url vars land
  // with each provider's real client when merchant onboarding completes.
  JAWWALPAY_MERCHANT_ID: z.string().optional(),
  JAWWALPAY_API_KEY: z.string().optional(),
  PALPAY_MERCHANT_ID: z.string().optional(),
  PALPAY_API_KEY: z.string().optional(),
  REFLECT_MERCHANT_ID: z.string().optional(),
  REFLECT_API_KEY: z.string().optional(),
  // Observability.
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_RELEASE: z.string().min(7).optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  // Empty string means "unset": dashboards (Render, Vercel) and template
  // .env files ship blank values, which would otherwise fail url/min
  // validators on optional vars with a confusing boot error.
  const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));
  const parsed = EnvSchema.safeParse(env);
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
    const wildcardOrigins = origins.filter((origin) => origin.includes("*"));
    if (wildcardOrigins.some((origin) => !isProjectScopedVercelWildcard(origin))) {
      failEnv({
        CORS_ORIGINS: [
          "Wildcard CORS origins are forbidden in production unless they are project-scoped Vercel preview origins.",
        ],
      });
    }
    if (!data.RESEND_API_KEY || !data.MAIL_FROM) {
      failEnv({
        RESEND_API_KEY: !data.RESEND_API_KEY
          ? ["RESEND_API_KEY is required in production."]
          : undefined,
        MAIL_FROM: !data.MAIL_FROM ? ["MAIL_FROM is required in production."] : undefined,
      });
    }
    if (!data.BAYDAR_WEB_URL) {
      failEnv({ BAYDAR_WEB_URL: ["BAYDAR_WEB_URL is required in production."] });
    }
    if (!data.INTERNAL_CRON_TOKEN) {
      failEnv({ INTERNAL_CRON_TOKEN: ["INTERNAL_CRON_TOKEN is required in production."] });
    }
    if (!data.HYPERPAY_ENTITY_ID || !data.HYPERPAY_ACCESS_TOKEN || !data.HYPERPAY_WEBHOOK_SECRET) {
      failEnv({
        HYPERPAY_ENTITY_ID: !data.HYPERPAY_ENTITY_ID
          ? ["HYPERPAY_ENTITY_ID is required in production."]
          : undefined,
        HYPERPAY_ACCESS_TOKEN: !data.HYPERPAY_ACCESS_TOKEN
          ? ["HYPERPAY_ACCESS_TOKEN is required in production."]
          : undefined,
        HYPERPAY_WEBHOOK_SECRET: !data.HYPERPAY_WEBHOOK_SECRET
          ? ["HYPERPAY_WEBHOOK_SECRET is required in production."]
          : undefined,
      });
    }
    if (!data.BANK_TRANSFER_IBAN || !data.BANK_TRANSFER_BENEFICIARY) {
      failEnv({
        BANK_TRANSFER_IBAN: !data.BANK_TRANSFER_IBAN
          ? ["BANK_TRANSFER_IBAN is required in production."]
          : undefined,
        BANK_TRANSFER_BENEFICIARY: !data.BANK_TRANSFER_BENEFICIARY
          ? ["BANK_TRANSFER_BENEFICIARY is required in production."]
          : undefined,
      });
    }
    if (!data.CLAMAV_SCAN_URL || !data.CLOUDFLARE_IMAGES_SCAN_URL) {
      failEnv({
        CLAMAV_SCAN_URL: !data.CLAMAV_SCAN_URL
          ? ["CLAMAV_SCAN_URL is required in production."]
          : undefined,
        CLOUDFLARE_IMAGES_SCAN_URL: !data.CLOUDFLARE_IMAGES_SCAN_URL
          ? ["CLOUDFLARE_IMAGES_SCAN_URL is required in production."]
          : undefined,
      });
    }
    if (!data.SENTRY_DSN || !data.SENTRY_RELEASE) {
      failEnv({
        SENTRY_DSN: !data.SENTRY_DSN ? ["SENTRY_DSN is required in production."] : undefined,
        SENTRY_RELEASE: !data.SENTRY_RELEASE
          ? ["SENTRY_RELEASE is required in production."]
          : undefined,
      });
    }
  }

  return data;
}

function failEnv(errors: Record<string, string[] | undefined>): never {
  // eslint-disable-next-line no-console
  console.error("[env] invalid configuration:", errors);
  process.exit(1);
}

function isProjectScopedVercelWildcard(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    const wildcardCount = Array.from(hostname.matchAll(/\*/g)).length;
    const firstLabel = hostname.split(".")[0];

    return (
      url.protocol === "https:" &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      hostname.endsWith(".vercel.app") &&
      wildcardCount === 1 &&
      firstLabel !== undefined &&
      firstLabel !== "*" &&
      firstLabel.includes("*")
    );
  } catch {
    return false;
  }
}
