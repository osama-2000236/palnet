import { formatPlace } from "./place";

describe("formatPlace", () => {
  it("pins PS so every runtime renders the same country", () => {
    // Node's ICU answers "الأراضي الفلسطينية" here and Chrome's answers
    // "فلسطين"; this is the assertion that keeps the three runtimes agreeing.
    expect(formatPlace("رام الله", "PS", "ar-PS")).toBe("رام الله، فلسطين");
    expect(formatPlace("Ramallah", "PS", "en")).toBe("Ramallah, Palestine");
  });

  it("drops the missing half rather than leaving a dangling separator", () => {
    expect(formatPlace("رام الله", null, "ar-PS")).toBe("رام الله");
    expect(formatPlace(null, "PS", "ar-PS")).toBe("فلسطين");
    expect(formatPlace(null, null, "ar-PS")).toBe("");
  });

  it("still localizes countries it does not pin", () => {
    expect(formatPlace("Amman", "JO", "en")).toBe("Amman, Jordan");
  });

  it("falls back to the raw code for an unknown region", () => {
    expect(formatPlace("Somewhere", "ZZ", "en")).toContain("Somewhere, ");
  });
});
