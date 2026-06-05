import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";
import { qaRunStatePath, type QaRunState } from "./qa-run";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const PUBLIC_ROUTES = [
  "/",
  "/ar-PS",
  "/en",
  "/ar-PS/login",
  "/en/login",
  "/ar-PS/register",
  "/en/register",
  "/ar-PS/forgot-password",
  "/en/forgot-password",
  "/ar-PS/legal/tos",
  "/ar-PS/legal/privacy",
  "/ar-PS/legal/community",
  "/ar-PS/legal/employer",
];

const AUTHED_ROUTES = [
  "/ar-PS/feed",
  "/en/feed",
  "/ar-PS/jobs",
  "/en/jobs",
  "/ar-PS/notifications",
  "/ar-PS/search",
  "/en/search",
  "/ar-PS/messages",
  "/ar-PS/messages/new",
  "/ar-PS/network",
  "/ar-PS/me",
  "/ar-PS/me/edit",
  "/ar-PS/me/karama",
  "/ar-PS/onboarding",
  "/ar-PS/settings",
  "/ar-PS/settings/account",
  "/ar-PS/settings/blocked",
  "/ar-PS/settings/notifications",
  "/ar-PS/settings/privacy",
  "/ar-PS/settings/security",
  "/ar-PS/employer",
  "/ar-PS/employer/new",
  "/ar-PS/billing",
  "/ar-PS/moderation",
];

test.describe("full route health", () => {
  test("public routes render in Arabic and English", async ({ page }) => {
    for (const route of PUBLIC_ROUTES) {
      await assertHealthyRoute(page, route);
    }
  });

  test.describe("authenticated routes", () => {
    test.describe.configure({ mode: "serial" });

    test.beforeEach(async ({ page, request }) => {
      test.skip(
        test.info().project.name !== "chromium-ar",
        "Authenticated route matrix runs once and includes ar-PS plus core en routes.",
      );
      const auth = await ensureA11yStorageState(request);
      await page.addInitScript((state) => {
        window.localStorage.setItem("baydar.session.v1", state.session);
        window.localStorage.setItem("baydar.deviceId", state.deviceId);
      }, auth);
    });

    test("core app, settings, admin, and employer surfaces render", async ({ page }) => {
      for (const route of AUTHED_ROUTES) {
        await assertHealthyRoute(page, route);
      }
    });

    test("profile, job detail, and seeded employer detail render", async ({ page, request }) => {
      const auth = await ensureA11yStorageState(request);
      await assertHealthyRoute(page, `/ar-PS/in/${auth.handle}`);

      const jobs = await request.get(`${API_BASE}/jobs?limit=1`);
      test.skip(!jobs.ok(), "API unavailable for seeded job discovery.");
      const jobBody = (await jobs.json()) as { data?: Array<{ id: string }> };
      const jobId = jobBody.data?.[0]?.id;
      test.skip(!jobId, "No seeded job available for job detail smoke.");
      await assertHealthyRoute(page, `/ar-PS/jobs/${jobId}`);

      const runId = await readQaRunId();
      test.skip(!runId, "No QA run id available for seeded employer routes.");
      const slug = `${runId}-baydar-labs`.toLowerCase();
      await assertHealthyRoute(page, `/ar-PS/employer/${slug}`);
      await assertHealthyRoute(page, `/ar-PS/employer/${slug}/jobs/new`);
    });
  });
});

async function assertHealthyRoute(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await page.waitForLoadState("domcontentloaded");
  const body = page.locator("body");
  await expect(body).toBeVisible();
  await expect(body).not.toContainText(/Application error|Unhandled Runtime Error/i);
  await expect(body).not.toContainText(/TypeError|ReferenceError|SyntaxError/);
}

async function readQaRunId(): Promise<string | null> {
  if (process.env.BAYDAR_QA_RUN_ID) return process.env.BAYDAR_QA_RUN_ID;
  try {
    const state = JSON.parse(await readFile(qaRunStatePath, "utf8")) as QaRunState;
    return state.runId;
  } catch {
    return null;
  }
}
