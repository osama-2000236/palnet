// The reaction picker, end to end.
//
// Six reaction types have existed in the schema, the shared enum and
// `PUT /posts/:id/reaction` since the posts module was written; every client
// collapsed them to a boolean and hard-coded `LIKE`. This spec is the check
// that the other five are actually reachable — and reachable *by keyboard*,
// which is where the category's hover-only flyouts strand people.

import { expect, test } from "@playwright/test";

import { ensureA11yStorageState } from "../tests/fixtures/auth";

test.beforeEach(async ({ page, request }) => {
  test.skip(
    test.info().project.name !== "chromium-ar",
    "Arabic labels are the subject; the en project would assert the wrong strings.",
  );
  const auth = await ensureA11yStorageState(request);
  // The a11y user is freshly registered, so their feed is empty until they post
  // — and the feed includes the viewer's own posts. One post is all this needs.
  const token = (JSON.parse(auth.session) as { tokens: { accessToken: string } }).tokens
    .accessToken;
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  await request.post(`${api}/posts`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { body: "منشور اختبار للتفاعلات", language: "ar" },
  });
  await page.addInitScript((state) => {
    window.localStorage.setItem("baydar.session.v1", state.session);
    window.localStorage.setItem("baydar.deviceId", state.deviceId);
  }, auth);
  await page.goto("/ar-PS/feed");
  await page.waitForSelector("button.react-press", { timeout: 60_000 });
});

test("the flyout offers all six types and hover opens it", async ({ page }) => {
  const trigger = page.locator("button.react-press[aria-haspopup='true']").first();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.hover();
  const flyout = page.getByRole("group", { name: "اختر تفاعلًا" });
  await expect(flyout).toBeVisible();
  await expect(flyout.getByRole("button")).toHaveCount(6);
  // Arabic names, not English enum members leaking to the surface.
  for (const label of ["إعجاب", "تهنئة", "مساندة", "تقدير", "إفادة", "طرافة"]) {
    await expect(flyout.getByRole("button", { name: label })).toBeVisible();
  }
});

test("focus opens the flyout, so a keyboard user can reach the other five", async ({ page }) => {
  const trigger = page.locator("button.react-press[aria-haspopup='true']").first();
  await trigger.focus();
  const flyout = page.getByRole("group", { name: "اختر تفاعلًا" });
  await expect(flyout).toBeVisible();

  // Escape closes it and puts focus back on the trigger — otherwise focus is
  // lost into the page and the user has to Tab from the top again.
  await page.keyboard.press("Escape");
  await expect(flyout).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("picking a type sets it, and picking the same one again clears it", async ({ page }) => {
  const trigger = page.locator("button.react-press[aria-haspopup='true']").first();
  const initial = (await trigger.getAttribute("aria-pressed")) === "true";
  if (initial) {
    // Start from a clean slate so the assertions below are unambiguous.
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-pressed", "false");
  }

  await trigger.hover();
  await page.getByRole("button", { name: "إفادة", exact: true }).click();

  // The trigger now *is* the chosen reaction: label and pressed state both.
  await expect(trigger).toHaveAttribute("aria-pressed", "true");
  await expect(trigger).toContainText("إفادة");

  // Survives a reload — i.e. the type reached the server, not just React state.
  await page.reload();
  await page.waitForSelector("button.react-press");
  const afterReload = page.locator("button.react-press[aria-haspopup='true']").first();
  await expect(afterReload).toContainText("إفادة");

  await afterReload.click();
  await expect(afterReload).toHaveAttribute("aria-pressed", "false");
  await expect(afterReload).toContainText("إعجاب");
});

test("a long press opens the picker without also toggling the reaction", async ({ page }) => {
  // On touch, a long press fires the open timer *and* a plain `click` on
  // release, so the gesture used to do both: choose "تهنئة" from the flyout and
  // you had also just liked (or un-liked) the post on the way in. Synthetic
  // pointer events rather than `page.touchscreen`, because what matters is the
  // `pointerType: "touch"` branch, and a real touch tap would not let us hold.
  const trigger = page.locator("button.react-press[aria-haspopup='true']").first();
  await expect(trigger).toHaveAttribute("aria-pressed", "false");

  await trigger.evaluate((el) => {
    el.dispatchEvent(
      new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true, isPrimary: true }),
    );
  });
  await page.waitForTimeout(600);
  await expect(page.getByRole("group", { name: "اختر تفاعلًا" })).toBeVisible();

  await trigger.evaluate((el) => {
    el.dispatchEvent(
      new PointerEvent("pointerup", { pointerType: "touch", bubbles: true, isPrimary: true }),
    );
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  // The picker is open and nothing was reacted to.
  await expect(trigger).toHaveAttribute("aria-pressed", "false");
});

test("post action labels do not clip at 390px in Arabic", async ({ page }) => {
  // PART 0 of the design brief removed these labels when five actions
  // overflowed, and requires any new label treatment to be re-measured here.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll("article button.react-press")]
      .map((button) => {
        const span = button.querySelector("span.truncate");
        return span && span.scrollWidth > span.clientWidth + 1
          ? (span.textContent ?? "").trim()
          : null;
      })
      .filter(Boolean),
  );
  expect(clipped).toEqual([]);
});
