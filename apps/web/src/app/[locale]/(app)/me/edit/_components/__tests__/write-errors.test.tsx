import type { Profile } from "@baydar/shared";
import React from "react";
import { createRoot, type Root } from "react-dom/client";

import { EducationsSection, SkillsSection } from "../EditProfileEducationSkills";
import { ExperiencesSection } from "../EditProfileExperiences";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// `t` is the identity function, so the rendered error line reads the raw key.
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockApiFetch = jest.fn();
jest.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("@/lib/session", () => ({
  getAccessToken: () => "access-token",
}));

// Each section only reads its own array off the profile; the rest is padding.
const profile = {
  experiences: [{ id: "exp-1", title: "t", companyName: "c", startDate: "2026-01-01" }],
  educations: [{ id: "edu-1", school: "s" }],
  skills: [{ id: "skill-1", name: "n" }],
} as unknown as Profile;

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await React.act(async () => {
      await Promise.resolve();
    });
  }
}

describe("edit-profile section write errors", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockApiFetch.mockReset();
    mockApiFetch.mockRejectedValue(new Error("boom"));
  });

  afterEach(() => {
    React.act(() => root.unmount());
    container.remove();
  });

  async function clickAndAssertError(button: Element | null | undefined): Promise<void> {
    if (!button) throw new Error("remove button not found");
    await React.act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    // The catch has to surface something — a swallowed rejection left the
    // reader thinking a delete had worked when it had not.
    expect(container.textContent).toContain("saveFailed");
  }

  it("surfaces a failed experience removal", async () => {
    React.act(() => root.render(<ExperiencesSection profile={profile} onChanged={jest.fn()} />));
    const remove = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "remove",
    );
    await clickAndAssertError(remove);
  });

  it("surfaces a failed education removal", async () => {
    React.act(() => root.render(<EducationsSection profile={profile} onChanged={jest.fn()} />));
    const remove = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "remove",
    );
    await clickAndAssertError(remove);
  });

  it("surfaces a failed skill removal", async () => {
    React.act(() => root.render(<SkillsSection profile={profile} onChanged={jest.fn()} />));
    await clickAndAssertError(container.querySelector('button[aria-label="remove"]'));
  });
});
