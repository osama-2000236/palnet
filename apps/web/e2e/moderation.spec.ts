import { readFile } from "node:fs/promises";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { AuthSession, type AuthSession as AuthSessionType } from "@baydar/shared";

import { ensureA11yStorageState, type A11yAuthState } from "../tests/fixtures/auth";
import { qaRunStatePath, type QaRunState } from "./qa-run";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

test.describe("moderation report lifecycle", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-en",
      "Moderation lifecycle runs once in English.",
    );
  });

  test("reporter submits, admin removes, reporter is notified", async ({ page, request }) => {
    const runId = await readQaRunId();
    const reporter = await ensureA11yStorageState(request);
    const targetBody = `QA moderation target ${runId}`;
    await connectReporterToPeer(request, reporter, runId);
    await setBrowserSession(page, reporter);

    await page.goto("/en/feed");
    const targetPost = page.locator("article").filter({ hasText: targetBody }).first();
    await expect(targetPost).toBeVisible();
    await targetPost.getByRole("button", { name: "Options" }).click();

    const dialog = page.getByRole("dialog", { name: "Report content" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("radio", { name: "Spam or scam" }).check();
    const reportResponse = page.waitForResponse(
      (response) => response.url().endsWith("/reports") && response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Submit report" }).click();
    const reportJson = (await (await reportResponse).json()) as { data?: { id?: string } };
    const reportId = reportJson.data?.id;
    expect(reportId).toBeTruthy();
    await expect(page.getByText("Report sent for review.")).toBeVisible();

    const admin = await loginAdmin(request, runId);
    await setBrowserSession(page, {
      deviceId: `playwright-admin-${runId}`,
      session: JSON.stringify(admin),
      handle: "",
    });
    await page.goto("/en/moderation");
    const reportCard = page.getByTestId(`moderation-report-${reportId}`);
    await expect(reportCard).toBeVisible();
    page.once("dialog", (confirmation) => confirmation.accept());
    await reportCard.getByRole("button", { name: "Hard delete" }).click();
    await expect(reportCard).toHaveCount(0);

    await setBrowserSession(page, reporter);
    await page.goto("/en/notifications");
    await expect(page.getByText("Your report was reviewed by the moderation team.")).toBeVisible();

    await page.goto("/en/feed");
    await expect(page.getByText(targetBody, { exact: true })).toHaveCount(0);
  });
});

async function loginAdmin(request: APIRequestContext, runId: string): Promise<AuthSessionType> {
  return loginUser(request, `qa+${runId}.admin@baydar.test`, `playwright-admin-${runId}`);
}

async function loginUser(
  request: APIRequestContext,
  email: string,
  deviceId: string,
): Promise<AuthSessionType> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password: "Password123", deviceId },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { data?: unknown };
  return AuthSession.parse(body.data);
}

async function connectReporterToPeer(
  request: APIRequestContext,
  reporter: A11yAuthState,
  runId: string,
): Promise<void> {
  const reporterSession = AuthSession.parse(JSON.parse(reporter.session));
  const peer = await loginUser(request, `qa+${runId}.peer@baydar.test`, `playwright-peer-${runId}`);
  const connectionResponse = await request.post(`${API_BASE}/connections`, {
    headers: { Authorization: `Bearer ${reporterSession.tokens.accessToken}` },
    data: { receiverId: peer.user.id },
  });
  if (connectionResponse.status() === 409) return;
  expect(connectionResponse.ok()).toBeTruthy();
  const connectionJson = (await connectionResponse.json()) as { data?: { id?: string } };
  expect(connectionJson.data?.id).toBeTruthy();
  const acceptResponse = await request.post(
    `${API_BASE}/connections/${connectionJson.data?.id}/respond`,
    {
      headers: { Authorization: `Bearer ${peer.tokens.accessToken}` },
      data: { action: "ACCEPT" },
    },
  );
  expect(acceptResponse.ok()).toBeTruthy();
}

async function setBrowserSession(page: Page, state: A11yAuthState): Promise<void> {
  await page.goto("/en");
  await page.evaluate(({ session, deviceId }) => {
    window.localStorage.setItem("baydar.session.v1", session);
    window.localStorage.setItem("baydar.deviceId", deviceId);
  }, state);
}

async function readQaRunId(): Promise<string> {
  if (process.env.BAYDAR_QA_RUN_ID) return process.env.BAYDAR_QA_RUN_ID;
  const state = JSON.parse(await readFile(qaRunStatePath, "utf8")) as QaRunState;
  return state.runId;
}
