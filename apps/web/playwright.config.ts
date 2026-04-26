import { defineConfig, devices } from "@playwright/test";

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
  webServer: {
    command: "pnpm --filter @baydar/web dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
