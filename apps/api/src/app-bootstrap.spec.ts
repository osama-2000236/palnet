import { loadEnv } from "./config/env";

describe("app bootstrap env validation", () => {
  const baseEnv = {
    DATABASE_URL: "postgresql://user:pass@localhost:5432/baydar",
    JWT_ACCESS_SECRET: "a".repeat(32),
    JWT_REFRESH_SECRET: "b".repeat(32),
  };
  const productionEnv = {
    BANK_TRANSFER_BENEFICIARY: "Baydar",
    BANK_TRANSFER_IBAN: "PS92PALS000000000000000000000",
    BAYDAR_WEB_URL: "https://web-tamb5sde9-osama-2000236s-projects.vercel.app",
    CLAMAV_SCAN_URL: "https://scanner.example.com/clamav",
    CLOUDFLARE_IMAGES_SCAN_URL: "https://scanner.example.com/images",
    HYPERPAY_ACCESS_TOKEN: "hyperpay-token",
    HYPERPAY_ENTITY_ID: "entity-id",
    HYPERPAY_WEBHOOK_SECRET: "webhook-secret",
    INTERNAL_CRON_TOKEN: "c".repeat(24),
    MAIL_FROM: "Baydar <noreply@example.com>",
    RESEND_API_KEY: "resend-key",
    SENTRY_DSN: "https://public@example.com/1",
    SENTRY_RELEASE: "abcdef1",
    SMS_GATEWAY_TOKEN: "sms-token",
    SMS_GATEWAY_URL: "https://sms.example.com/send",
  };
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("rejects wildcard CORS origins in production", () => {
    process.env = {
      ...originalEnv,
      ...baseEnv,
      NODE_ENV: "production",
      CORS_ORIGINS: "*",
    };
    const exit = jest.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => loadEnv()).toThrow("process.exit:1");
    expect(exit).toHaveBeenCalledWith(1);
    expect(error).toHaveBeenCalledWith(
      "[env] invalid configuration:",
      expect.objectContaining({
        CORS_ORIGINS: expect.arrayContaining([
          expect.stringContaining("Wildcard CORS origins are forbidden"),
        ]),
      }),
    );
  });

  it("allows project-scoped Vercel wildcard CORS origins in production", () => {
    process.env = {
      ...originalEnv,
      ...baseEnv,
      ...productionEnv,
      NODE_ENV: "production",
      CORS_ORIGINS: "https://web-*-osama-2000236s-projects.vercel.app",
    };

    expect(loadEnv().CORS_ORIGINS).toBe("https://web-*-osama-2000236s-projects.vercel.app");
  });

  // The prod-required list is one loop over one array; this is what fails if
  // that loop stops running, or if a var silently drops off the array. It also
  // pins the behaviour the eight hand-written blocks did NOT have: EVERY
  // missing var is reported, not just the first group that failed.
  it("names every missing production var in one pass", () => {
    const { RESEND_API_KEY, SENTRY_RELEASE, ...restOfProduction } = productionEnv;
    process.env = {
      ...originalEnv,
      ...baseEnv,
      ...restOfProduction,
      NODE_ENV: "production",
      CORS_ORIGINS: "https://baydar.ps",
    };
    jest.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => loadEnv()).toThrow("process.exit:1");
    expect(error).toHaveBeenCalledWith("[env] invalid configuration:", {
      RESEND_API_KEY: ["RESEND_API_KEY is required in production."],
      SENTRY_RELEASE: ["SENTRY_RELEASE is required in production."],
    });
    expect(RESEND_API_KEY).toBeDefined();
    expect(SENTRY_RELEASE).toBeDefined();
  });

  it("rejects missing CORS origins in production", () => {
    process.env = {
      ...originalEnv,
      ...baseEnv,
      NODE_ENV: "production",
      CORS_ORIGINS: "",
    };
    jest.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => loadEnv()).toThrow("process.exit:1");
    expect(error).toHaveBeenCalledWith(
      "[env] invalid configuration:",
      expect.objectContaining({
        CORS_ORIGINS: expect.arrayContaining([expect.stringContaining("required in production")]),
      }),
    );
  });
});
