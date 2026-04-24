import { expect, test } from "@playwright/test";

import {
  applyToJobViaApi,
  createUserViaApi,
  findJobByTitleViaApi,
  loginViaApi,
  setSession,
} from "./helpers";

let ownerSessionPromise: ReturnType<typeof loginViaApi> | null = null;

function getOwnerSession(request: Parameters<typeof loginViaApi>[0]) {
  ownerSessionPromise ??= loginViaApi(request, "owner@palnet.ps", "Password123");
  return ownerSessionPromise;
}

test.describe("Jobs beta flows", () => {
  test("company admin can create a job from the admin console", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-en");

    const session = await getOwnerSession(request);
    const title = `Platform QA ${Date.now()}`;

    await setSession(page, session);
    await page.goto("/en/companies/baydar/admin");
    await page.getByLabel(/job title/i).fill(title);
    await page.getByLabel(/job description/i).fill(
      "Own QA flows, strengthen release confidence, and expand coverage across core hiring surfaces.",
    );
    await page.getByLabel(/^city$/i).nth(1).fill("Ramallah");
    await page.getByRole("button", { name: /create job/i }).click();

    await expect(page.getByRole("link", { name: title })).toBeVisible();
  });

  test("candidate can apply to a job and see it on the dashboard", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-en");

    const candidate = await createUserViaApi(request, "applicant");
    await setSession(page, candidate.session);

    await page.goto("/en/jobs");
    await page.getByRole("link", { name: /Platform Engineer/i }).click();
    await page.getByRole("button", { name: /^apply$/i }).click();
    await page.getByRole("button", { name: /send application/i }).click();
    await expect(page.getByText(/applied/i)).toBeVisible();

    await page.goto("/en/me/jobs");
    await expect(page.getByRole("link", { name: /Platform Engineer/i })).toBeVisible();
    await expect(page.getByText("Submitted", { exact: true })).toBeVisible();
  });

  test("company admin can update application status and the applicant sees it", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-en");

    const candidate = await createUserViaApi(request, "candidate");
    const reviewJob = await findJobByTitleViaApi(
      request,
      "Senior Backend Engineer",
      candidate.session,
    );
    await applyToJobViaApi(
      request,
      candidate.session,
      reviewJob.id,
      "Playwright candidate ready for a shortlist review.",
    );

    const ownerSession = await getOwnerSession(request);
    await setSession(page, ownerSession);

    await page.goto("/en/companies/baydar/admin");
    const jobCard = page
      .getByRole("link", { name: /Senior Backend Engineer/i })
      .locator("xpath=ancestor::div[contains(@class,'rounded-lg') and contains(@class,'border')][1]");
    await jobCard.getByRole("button", { name: "Load applicants" }).click();
    const applicantCard = jobCard
      .locator("li")
      .filter({
        has: page.getByText(`${candidate.firstName} ${candidate.lastName}`),
      })
      .first();
    await expect(applicantCard).toBeVisible();
    await applicantCard.getByRole("button", { name: "Shortlisted" }).click();

    await setSession(page, candidate.session);
    await page.goto("/en/me/jobs");
    await expect(page.getByRole("link", { name: /Senior Backend Engineer/i })).toBeVisible();
    await expect(page.getByText("Shortlisted", { exact: true })).toBeVisible();
  });
});
