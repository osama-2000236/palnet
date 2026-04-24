import { expect, test } from "@playwright/test";

import { signOutViaUi } from "./helpers";

test.describe("Auth beta flows", () => {
  test("registers, onboards, and signs out", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-en");

    const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `register-${tag}@e2e.palnet.test`;
    const handle = `register-${tag.slice(-8)}`;

    await page.goto("/en/register");
    await page.getByLabel("First name").fill("Register");
    await page.getByLabel("Last name").fill("Flow");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Password123");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /create my account/i }).click();

    await expect(page).toHaveURL(/\/en\/onboarding$/);
    const firstNameField = page.getByLabel("First name");
    if (await firstNameField.isVisible()) {
      await firstNameField.fill("Register");
    }
    const lastNameField = page.getByLabel("Last name");
    if (await lastNameField.isVisible()) {
      await lastNameField.fill("Flow");
    }
    await page.getByLabel(/handle/i).fill(handle);
    await page.getByLabel(/headline/i).fill("Playwright onboarding flow");
    await page.getByLabel(/location/i).fill("Ramallah");
    await page.getByRole("button", { name: /save and continue/i }).click();

    await expect(page).toHaveURL(/\/en\/feed$/);
    await expect(page.getByRole("button", { name: /start a post/i })).toBeVisible();

    await signOutViaUi(page);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});
