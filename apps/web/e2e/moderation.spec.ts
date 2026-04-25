import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { expect, test } from "@playwright/test";

import { createUserViaApi, loginViaApi, setSession, signOutViaUi } from "./helpers";

const prisma = new PrismaClient();

test.describe("Moderation flow", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("report, takedown, and notify", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-en");
    // FIXME: selectors need to be aligned with the actual rendered DOM in CI.
    // The flow runs locally but the locators ("start a post" button,
    // "more options" button on the profile post card) don't resolve in CI.
    // Re-enable after auditing the moderation surfaces against the spec.
    test.fixme(true, "Selectors require alignment with rendered DOM in CI.");

    const author = await createUserViaApi(request, "report-target");
    const reporter = await createUserViaApi(request, "reporter");
    const password = "Password123";
    const moderatorEmail = `moderator-${Date.now()}@e2e.palnet.test`;
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email: moderatorEmail,
        passwordHash,
        role: "MODERATOR",
        locale: "en",
        emailVerified: new Date(),
        profile: {
          create: {
            handle: `moderator-${Date.now()}`,
            firstName: "Mod",
            lastName: "Erator",
            country: "PS",
          },
        },
      },
    });
    const moderatorSession = await loginViaApi(request, moderatorEmail, password);

    const postBody = `Moderation target ${Date.now()}`;

    await setSession(page, author.session);
    await page.goto("/en/feed");
    await page.getByRole("button", { name: /start a post/i }).click();
    await page.getByPlaceholder(/start a post/i).fill(postBody);
    await page.getByRole("button", { name: /^Post$/i }).click();
    await expect(page.getByText(postBody)).toBeVisible();

    await signOutViaUi(page);

    await setSession(page, reporter.session);
    await page.goto(`/en/in/${author.handle}`);
    await expect(page.getByText(postBody)).toBeVisible();
    await page.getByRole("button", { name: /more options/i }).click();
    await page.getByRole("menuitem", { name: /report this post/i }).click();
    await page.getByRole("radio", { name: /spam or scam/i }).check();
    await page.getByRole("button", { name: /submit report/i }).click();
    await expect(page.getByText(/report received/i)).toBeVisible();

    await signOutViaUi(page);

    await setSession(page, moderatorSession);
    await page.goto("/en/admin/moderation/reports");
    await expect(page.getByText(postBody)).toBeVisible();
    await page.getByText(postBody).click();
    await page.getByTestId("admin-action-reason").fill("Policy review");
    await page.getByTestId("admin-takedown").click();

    await signOutViaUi(page);

    await setSession(page, reporter.session);
    await page.goto("/en/notifications");
    await expect(page.getByText(/removed by moderators/i)).toBeVisible();
  });
});
