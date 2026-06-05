import { defineConfig, devices } from "@playwright/test";

const skipSafetyE2EOnEperm = process.env.BAYDAR_SKIP_SAFETY_E2E_ON_EPERM === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
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
          command: "node ../../scripts/run-api-local.mjs ../../.env.local",
          url: "http://localhost:4000/api/v1/health",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: "pnpm --filter @baydar/web dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
