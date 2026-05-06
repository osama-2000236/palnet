import { loadEnv } from "./config/env";

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
