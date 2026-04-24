import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    locale: "ar-PS",
  },
  projects: [
    { name: "chromium-ar", use: { ...devices["Desktop Chrome"], locale: "ar-PS" } },
    { name: "chromium-en", use: { ...devices["Desktop Chrome"], locale: "en" } },
  ],
  webServer: [
    {
      command: "corepack pnpm --filter @palnet/api dev",
      url: "http://localhost:4000/api/docs",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "corepack pnpm --filter @palnet/web dev",
      url: "http://localhost:3000/en/login",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
