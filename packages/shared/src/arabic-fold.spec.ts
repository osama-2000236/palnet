import { foldArabic } from "./arabic-fold";

describe("foldArabic", () => {
  it("folds hamza-carrying alef variants to bare alef", () => {
    expect(foldArabic("أحمد")).toBe("احمد");
    expect(foldArabic("إبراهيم")).toBe("ابراهيم");
    expect(foldArabic("آمنة")).toBe("امنه");
  });

  it("folds teh marbuta to heh", () => {
    expect(foldArabic("مبرمجة")).toBe("مبرمجه");
  });

  it("folds alef maqsura to yeh", () => {
    expect(foldArabic("مصطفى")).toBe("مصطفي");
  });

  it("strips tashkeel and tatweel", () => {
    expect(foldArabic("مُحَمَّد")).toBe("محمد");
    expect(foldArabic("فلســـطين")).toBe("فلسطين");
  });

  it("keeps hamza on waw/yeh seats and non-Arabic text untouched", () => {
    expect(foldArabic("مسؤول")).toBe("مسؤول");
    expect(foldArabic("هيئة")).toBe("هيئه");
    expect(foldArabic("Frontend Dev 42")).toBe("Frontend Dev 42");
  });

  it("is idempotent", () => {
    const once = foldArabic("أُستاذةٌ مصطفى");
    expect(foldArabic(once)).toBe(once);
  });
});
