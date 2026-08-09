import { addressSuffix, addressed } from "./addressing";
import { AddressGender } from "./identity-enums";

const ADD = {
  neutral: "أضيفوا خبرتكم",
  feminine: "أضيفي خبرتك",
  masculine: "أضِف خبرتك",
};

describe("addressed", () => {
  it("picks the form that agrees with the reader", () => {
    expect(addressed(ADD, AddressGender.FEMININE)).toBe("أضيفي خبرتك");
    expect(addressed(ADD, AddressGender.MASCULINE)).toBe("أضِف خبرتك");
    expect(addressed(ADD, AddressGender.NEUTRAL_PLURAL)).toBe("أضيفوا خبرتكم");
  });

  it("uses the polite plural when nobody has said", () => {
    // Never wrong about anybody, which is why it is the default rather than a
    // placeholder waiting to be filled in.
    expect(addressed(ADD, null)).toBe("أضيفوا خبرتكم");
    expect(addressed(ADD, undefined)).toBe("أضيفوا خبرتكم");
  });

  it("falls back rather than rendering nothing when a form is missing", () => {
    // Most strings do not address the reader; those carry `neutral` alone, and
    // asking for a gendered form must not produce an empty label.
    const plain = { neutral: "الملف الشخصي" };
    expect(addressed(plain, AddressGender.FEMININE)).toBe("الملف الشخصي");
    expect(addressed(plain, AddressGender.MASCULINE)).toBe("الملف الشخصي");
  });
});

describe("addressSuffix", () => {
  it("names the sibling key mobile's flat catalog looks for", () => {
    expect(addressSuffix(AddressGender.FEMININE)).toBe("_feminine");
    expect(addressSuffix(AddressGender.MASCULINE)).toBe("_masculine");
    expect(addressSuffix(AddressGender.NEUTRAL_PLURAL)).toBe("");
    expect(addressSuffix(null)).toBe("");
  });
});
