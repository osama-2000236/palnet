// `openToWork` / `hiring` round-trip.
//
// Both fields have been on the Profile DTO and accepted by `UpdateProfileBody`
// since the schema was written, with no editor that set them and no surface
// that showed them. That is exactly the shape of thing that can be re-broken
// without anyone noticing, because a PATCH that silently drops a field still
// returns 200 — so this walks the whole chain: switch → PATCH → DTO → badge.

import { expect, test } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

test("toggling 'open to work' saves and shows the badge on the profile", async ({
  page,
  request,
}) => {
  test.skip(
    test.info().project.name !== "chromium-ar",
    "Asserts Arabic labels; the en project would look for the wrong strings.",
  );
  const auth = await ensureA11yStorageState(request);
  await page.addInitScript((state) => {
    window.localStorage.setItem("baydar.session.v1", state.session);
    window.localStorage.setItem("baydar.deviceId", state.deviceId);
  }, auth);

  await page.goto("/ar-PS/me/edit");
  const row = page.getByRole("switch", { name: "متاح للعمل" });
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("aria-checked", "false");

  await row.click();
  await expect(row).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "حفظ", exact: true }).first().click();

  // Reload rather than trusting local state: the point is that the value
  // survived the PATCH and came back on the DTO.
  await page.reload();
  await expect(page.getByRole("switch", { name: "متاح للعمل" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.goto(`/ar-PS/in/${auth.handle}`);
  await expect(page.getByText("متاح للعمل").first()).toBeVisible();
});
