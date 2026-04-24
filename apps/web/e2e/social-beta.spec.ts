import { expect, test } from "@playwright/test";

import { createUserViaApi, setSession, signOutViaUi } from "./helpers";

test.describe("Social beta flows", () => {
  test("user can create a text post", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-en");

    const author = await createUserViaApi(request, "poster");
    const body = `Playwright text post ${Date.now()}`;

    await setSession(page, author.session);
    await page.goto("/en/feed");
    await page.getByRole("button", { name: /start a post/i }).click();
    await page.getByPlaceholder(/start a post/i).fill(body);
    await page.getByRole("button", { name: "Post", exact: true }).click();

    await expect(page.getByText(body)).toBeVisible();
  });

  test("user can send and accept a connection request", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-en");

    const sender = await createUserViaApi(request, "sender");
    const receiver = await createUserViaApi(request, "receiver");

    await setSession(page, sender.session);
    await page.goto(`/en/in/${receiver.handle}`);
    await page.getByRole("button", { name: /connect/i }).click();
    await expect(page.getByRole("button", { name: /withdraw/i })).toBeVisible();

    await setSession(page, receiver.session);
    await page.goto("/en/network");
    await page.getByRole("button", { name: /invitations/i }).click();
    await expect(page.getByText(`${sender.firstName} ${sender.lastName}`)).toBeVisible();
    await page.getByRole("button", { name: /accept/i }).click();

    await setSession(page, sender.session);
    await page.goto(`/en/in/${receiver.handle}`);
    await expect(page.getByRole("button", { name: /remove/i })).toBeVisible();
  });

  test("recipient reads message and clears notification unread state", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-en");

    const sender = await createUserViaApi(request, "messenger");
    const recipient = await createUserViaApi(request, "recipient");
    const messageBody = `Message body ${Date.now()}`;

    await setSession(page, sender.session);
    await page.goto(`/en/in/${recipient.handle}`);
    await page.getByRole("button", { name: /new message/i }).click();
    await expect(page).toHaveURL(/\/en\/messages\?room=/);
    await expect(page.locator("textarea")).toBeVisible();
    await page.locator("textarea").fill(messageBody);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText(messageBody)).toBeVisible();

    await signOutViaUi(page);
    await setSession(page, recipient.session);
    await page.goto("/en/feed");
    await page.goto("/en/notifications");
    const senderNotification = page.getByText(`${sender.firstName} ${sender.lastName}`).first();
    await expect(senderNotification).toBeVisible();
    await senderNotification.click();
    await expect(page).toHaveURL(/\/en\/messages\?room=/);
    await expect(page.getByRole("button", { name: /unread notifications/i })).toHaveCount(0);
    await expect(page.getByRole("log").getByText(messageBody)).toBeVisible();
  });
});
