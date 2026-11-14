import { Logger } from "@nestjs/common";

import { loadEnv } from "./config/env";
import { ConsoleMailTransport } from "./modules/mail/console-mail.transport";

describe("app bootstrap env validation", () => {
  const baseEnv = {
    DATABASE_URL: "postgresql://user:pass@localhost:5432/baydar",
    JWT_ACCESS_SECRET: "a".repeat(32),
    JWT_REFRESH_SECRET: "b".repeat(32),
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

  it("allows staging to boot with console mail and production Node settings", () => {
    process.env = {
      ...originalEnv,
      ...baseEnv,
      NODE_ENV: "production",
      BAYDAR_ENV: "staging",
      CORS_ORIGINS: "https://staging.example.com",
    };

    expect(loadEnv()).toMatchObject({
      NODE_ENV: "production",
      BAYDAR_ENV: "staging",
    });
  });

  it("does not log email token URLs when staging uses production Node settings", async () => {
    process.env = { ...originalEnv, NODE_ENV: "production", BAYDAR_ENV: "staging" };
    const log = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    const secret = "do-not-log-this-token";

    await new ConsoleMailTransport().send("password-reset", "user@example.com", {
      url: `https://staging.example.com/reset/${secret}`,
      locale: "en",
    });

    expect(log.mock.calls.flat().join(" ")).not.toContain(secret);
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
