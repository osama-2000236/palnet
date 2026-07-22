import { readFile } from "node:fs/promises";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { AuthSession, Invoice, type AuthSession as AuthSessionType } from "@baydar/shared";
import { z } from "zod";

import { ensureA11yStorageState, type A11yAuthState } from "../tests/fixtures/auth";
import { qaRunStatePath, type QaRunState } from "./qa-run";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

test.describe("billing bank-transfer review lifecycle", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-en", "Billing review runs once in English.");
  });

  test("buyer submits receipt, admin marks paid, invoice activates", async ({
    baseURL,
    page,
    request,
  }) => {
    const runId = await readQaRunId();
    const buyer = await ensureA11yStorageState(request);
    const buyerSession = AuthSession.parse(JSON.parse(buyer.session));
    const buyerToken = buyerSession.tokens.accessToken;

    // Buyer: bank-transfer checkout + receipt upload via the public API.
    // returnUrl must be a first-party origin — the API allowlists it against
    // CORS_ORIGINS, which the Playwright webServer sets to this same baseURL.
    // Hardcoding a port here silently drifts from the server under test.
    const checkout = await request.post(`${API_BASE}/billing/checkout-session`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
      data: {
        planCode: "USER_PREMIUM",
        method: "BANK_TRANSFER",
        returnUrl: `${baseURL}/en/me/premium`,
      },
    });
    expect(checkout.ok()).toBeTruthy();
    const checkoutJson = (await checkout.json()) as
      | { data?: { invoiceId?: string } }
      | { invoiceId?: string };
    // Envelope varies per endpoint; accept both { data: {...} } and raw.
    const invoiceId =
      "data" in checkoutJson && checkoutJson.data
        ? checkoutJson.data.invoiceId
        : (checkoutJson as { invoiceId?: string }).invoiceId;
    expect(invoiceId, `unexpected checkout response: ${JSON.stringify(checkoutJson)}`).toBeTruthy();

    const receipt = await request.post(
      `${API_BASE}/billing/invoices/${invoiceId}/pay-by-transfer`,
      {
        headers: { Authorization: `Bearer ${buyerToken}` },
        data: { receiptUrl: `https://media.baydar.ps/qa/receipt-${runId}.jpg` },
      },
    );
    expect(receipt.ok()).toBeTruthy();

    // Admin: the invoice sits in the needs-review queue with payer identity.
    const admin = await loginAdmin(request, runId);
    await setBrowserSession(page, {
      deviceId: `playwright-admin-${runId}`,
      session: JSON.stringify(admin),
      handle: "",
    });
    await page.goto("/en/billing");
    const invoiceCard = page.getByTestId(`billing-invoice-${invoiceId}`);
    await expect(invoiceCard).toBeVisible();
    await expect(invoiceCard.getByText(buyerSession.user.email)).toBeVisible();

    page.once("dialog", (confirmation) => confirmation.accept());
    await invoiceCard.getByRole("button", { name: "Mark paid" }).click();
    await expect(invoiceCard).toHaveCount(0);

    // Paid history shows the reviewed invoice, read-only.
    await page.getByRole("tab", { name: "Paid" }).click();
    const paidCard = page.getByTestId(`billing-invoice-${invoiceId}`);
    await expect(paidCard).toBeVisible();
    await expect(paidCard.getByRole("button", { name: "Mark paid" })).toHaveCount(0);

    // Buyer: the invoice reads PAID through the public API too.
    const invoicesResponse = await request.get(`${API_BASE}/billing/invoices`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(invoicesResponse.ok()).toBeTruthy();
    const invoicesJson = (await invoicesResponse.json()) as { data?: unknown };
    const invoices = z.array(Invoice).parse(invoicesJson.data ?? invoicesJson);
    const paid = invoices.find((invoice) => invoice.id === invoiceId);
    expect(paid?.status).toBe("PAID");
    expect(paid?.paidAt).toBeTruthy();
  });
});

async function loginAdmin(request: APIRequestContext, runId: string): Promise<AuthSessionType> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: {
      email: `qa+${runId}.admin@baydar.test`,
      password: "Password123",
      deviceId: `playwright-admin-${runId}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { data?: unknown };
  return AuthSession.parse(body.data);
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
