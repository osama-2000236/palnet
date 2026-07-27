import { profileCompletion, type Profile } from "@baydar/shared";

const bare = {
  userId: "u1",
  handle: "layan",
  firstName: "ليان",
  lastName: "الخطيب",
  avatarUrl: null,
  headline: null,
  location: null,
  experiences: [],
  educations: [],
  skills: [],
} as unknown as Profile;

describe("profileCompletion", () => {
  it("counts nothing and points at the avatar for an empty profile", () => {
    expect(profileCompletion(bare)).toEqual({ completed: 0, total: 5, next: "avatar" });
  });

  it("advances to the first unfinished step, not merely the last one missing", () => {
    const partial = { ...bare, avatarUrl: "a.png", headline: "مهندسة", skills: [{ id: "s1" }] };
    const out = profileCompletion(partial as unknown as Profile);

    expect(out.completed).toBe(3);
    // location comes before experience in the nudge order.
    expect(out.next).toBe("location");
  });

  it("reports no next step once every field is filled", () => {
    const full = {
      ...bare,
      avatarUrl: "a.png",
      headline: "مهندسة",
      location: "رام الله",
      experiences: [{ id: "e1" }],
      skills: [{ id: "s1" }],
    };
    const out = profileCompletion(full as unknown as Profile);

    expect(out).toEqual({ completed: 5, total: 5, next: null });
  });
});
