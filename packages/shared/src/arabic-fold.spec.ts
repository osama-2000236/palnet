import { foldArabic, foldSkillName } from "./arabic-fold";

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

describe("foldSkillName", () => {
  // The SQL twin is
  //   lower(btrim(regexp_replace(baydar_fold(name), '\s+', ' ', 'g')))
  // in migration 202608090009. Each case below is a thing that SQL does, so a
  // divergence in either spelling fails here rather than in production, where
  // it looks like an endorsement count quietly splitting in two.
  it("clusters Latin case variants", () => {
    expect(foldSkillName("JavaScript")).toBe(foldSkillName("javascript"));
    expect(foldSkillName("SQL")).toBe("sql");
  });

  it("clusters Arabic orthographic variants", () => {
    expect(foldSkillName("إدارة المشاريع")).toBe(foldSkillName("ادارة المشاريع"));
    expect(foldSkillName("محاسبة")).toBe("محاسبه");
  });

  it("collapses runs of whitespace and trims the ends", () => {
    expect(foldSkillName("  React   Native  ")).toBe("react native");
    expect(foldSkillName("إدارة\tالمشاريع")).toBe("اداره المشاريع");
  });

  it("is idempotent", () => {
    const once = foldSkillName("  تَصميم   الجرافيك ");
    expect(foldSkillName(once)).toBe(once);
  });

  it("keeps genuinely different skills apart", () => {
    // The fold must not over-cluster: three rows here, not one.
    expect(new Set(["نجارة", "حدادة", "سباكة"].map(foldSkillName)).size).toBe(3);
  });
});
