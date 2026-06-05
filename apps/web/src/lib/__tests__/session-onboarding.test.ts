import { clearOnboardingHandoff, readOnboardingHandoff, writeOnboardingHandoff } from "../session";

describe("onboarding handoff session flag", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("stores, reads, and clears the one-time onboarding handoff", () => {
    writeOnboardingHandoff({ name: "Maha Darwish" });

    expect(readOnboardingHandoff()).toMatchObject({
      name: "Maha Darwish",
    });
    expect(readOnboardingHandoff()?.createdAt).toEqual(expect.any(String));

    clearOnboardingHandoff();
    expect(readOnboardingHandoff()).toBeNull();
  });
});
