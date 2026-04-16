import { expect, test } from "@playwright/test";

test("ar-PS landing renders RTL", async ({ page }) => {
  await page.goto("/ar-PS");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(html).toHaveAttribute("lang", "ar-PS");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("en landing renders LTR", async ({ page }) => {
  await page.goto("/en");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("dir", "ltr");
  await expect(html).toHaveAttribute("lang", "en");
});
