import { personName } from "./person";

describe("personName", () => {
  it("prefers the full name and falls back to the handle", () => {
    expect(personName({ handle: "layan", firstName: "ليان", lastName: "خليل" })).toBe("ليان خليل");
    expect(personName({ handle: "layan", firstName: " ", lastName: "" })).toBe("layan");
    expect(personName(null)).toBe("");
  });
});
