import { expect, test } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

test("safety: block from profile, view blocked list, unblock", async ({ page, request }) => {
  const auth = await ensureA11yStorageState(request);
  const session = JSON.parse(auth.session) as { tokens: { accessToken: string } };
  const stamp = Date.now();
  const targetEmail = `safety-target-${stamp}@baydar.test`;
  const targetHandle = `safety-${stamp}`;
  const password = "Password123";

  const registered = await request.post(`${API_BASE}/auth/register`, {
    data: {
      email: targetEmail,
      password,
      firstName: "Safety",
      lastName: "Target",
      locale: "ar-PS",
      acceptTerms: true,
    },
  });
  expect(registered.ok()).toBeTruthy();
  const targetSession = ((await registered.json()) as {
    data: { tokens: { accessToken: string } };
  }).data;
  const onboarded = await request.post(`${API_BASE}/profiles/onboard`, {
    headers: { Authorization: `Bearer ${targetSession.tokens.accessToken}` },
    data: {
      handle: targetHandle,
      firstName: "Safety",
      lastName: "Target",
      headline: "QA target",
      location: "Ramallah",
      country: "PS",
    },
  });
  expect(onboarded.ok()).toBeTruthy();

  await page.addInitScript((state) => {
    window.localStorage.setItem("baydar.session.v1", state.session);
    window.localStorage.setItem("baydar.deviceId", state.deviceId);
  }, auth);

  await page.goto(`/ar-PS/in/${targetHandle}`);
  await page.getByRole("button", { name: "حظر" }).click();
  await page.getByRole("button", { name: "تأكيد الحظر" }).click();
  await expect(page).toHaveURL(/\/ar-PS\/feed$/);

  await page.goto("/ar-PS/settings/blocked");
  await expect(page.getByText("Safety Target")).toBeVisible();
  await page.getByRole("button", { name: "إلغاء الحظر" }).click();
  await expect(page.getByText("Safety Target")).toHaveCount(0);

  const list = await request.get(`${API_BASE}/blocks`, {
    headers: { Authorization: `Bearer ${session.tokens.accessToken}` },
  });
  expect(list.ok()).toBeTruthy();
});
