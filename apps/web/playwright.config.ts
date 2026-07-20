import { defineConfig, devices } from "@playwright/test";

const skipSafetyE2EOnEperm = process.env.BAYDAR_SKIP_SAFETY_E2E_ON_EPERM === "1";
const e2eEnvFile = process.env.BAYDAR_E2E_ENV_FILE ?? "../../.env.qa.local";
const defaultApiPort = process.env.BAYDAR_E2E_API_PORT ?? "4100";
const e2eWebPort = process.env.BAYDAR_E2E_WEB_PORT ?? "3101";
const e2eApiUrl = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${defaultApiPort}/api/v1`;
const e2eWebUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${e2eWebPort}`;
const e2eWebCommand = process.env.CI
  ? `pnpm --filter @baydar/web exec next start -p ${e2eWebPort}`
  : `pnpm --filter @baydar/web dev`;
// The API must bind the same port its health URL is polled on. When CI
// overrides NEXT_PUBLIC_API_URL (e.g. :4000) without setting
// BAYDAR_E2E_API_PORT, the bind port (API_PORT) and the health URL diverged
// and the webServer health check timed out. Derive the bind port from the
// resolved API URL so the two always match.
const e2eApiPort = (() => {
  try {
    return new URL(e2eApiUrl).port || defaultApiPort;
  } catch {
    return defaultApiPort;
  }
})();

process.env.NEXT_PUBLIC_API_URL = e2eApiUrl;
process.env.PLAYWRIGHT_BASE_URL = e2eWebUrl;

export default defineConfig({
  testDir: "./e2e",
  // 30s default flakes locally: parallel workers vs `next dev` cold route
  // compiles push page.goto past 30s. CI uses `next start` and is unaffected.
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: e2eWebUrl,
    trace: "on-first-retry",
    locale: "ar-PS",
  },
  projects: [
    { name: "chromium-ar", use: { ...devices["Desktop Chrome"], locale: "ar-PS" } },
    { name: "chromium-en", use: { ...devices["Desktop Chrome"], locale: "en" } },
  ],
  webServer: skipSafetyE2EOnEperm
    ? []
    : [
        {
          command: `node ../../scripts/run-api-local.mjs ${e2eEnvFile}`,
          url: `${e2eApiUrl}/health`,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            API_PORT: e2eApiPort,
            CORS_ORIGINS: e2eWebUrl,
            NEXT_PUBLIC_API_URL: e2eApiUrl,
            PLAYWRIGHT_BASE_URL: e2eWebUrl,
          },
        },
        {
          command: e2eWebCommand,
          url: e2eWebUrl,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            NEXT_PUBLIC_API_URL: e2eApiUrl,
            PLAYWRIGHT_BASE_URL: e2eWebUrl,
            PORT: e2eWebPort,
          },
        },
      ],
});
