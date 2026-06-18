import { isProfileComplete, isProfileOnboarded } from "./profile-completion";

const onboardedProfile = {
  firstName: "Osama",
  lastName: "Hamad",
  handle: "osama",
  headline: "Full Stack Engineer",
  location: "Ramallah",
};

describe("profile completion helpers", () => {
  it("treats basic onboarding identity as onboarded", () => {
    expect(isProfileOnboarded(onboardedProfile)).toBe(true);
  });

  it("requires background entries for full profile completion", () => {
    expect(isProfileComplete(onboardedProfile)).toBe(false);
    expect(isProfileComplete({ ...onboardedProfile, experiences: [{ id: "exp_1" }] })).toBe(true);
  });
});
