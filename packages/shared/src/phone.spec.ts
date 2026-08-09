import { E164_PATTERN, foldDigits, isE164, phoneTail, toE164 } from "./phone";

describe("foldDigits", () => {
  it("folds Arabic-Indic and Persian digits to ASCII", () => {
    expect(foldDigits("٠٥٩٩١٢٣٤٥٦")).toBe("0599123456");
    expect(foldDigits("۰۵۹۹۱۲۳۴۵۶")).toBe("0599123456");
  });

  it("leaves ASCII and separators alone", () => {
    expect(foldDigits("+970 59-912 3456")).toBe("+970 59-912 3456");
  });
});

describe("toE164", () => {
  it("accepts every way a Palestinian mobile gets typed", () => {
    for (const typed of [
      "0599123456",
      "599123456",
      "+970599123456",
      "00970599123456",
      "+970 59 912 3456",
      "970-599-123-456",
      "٠٥٩٩١٢٣٤٥٦",
    ]) {
      expect(toE164(typed)).toBe("+970599123456");
    }
  });

  it("keeps +972 when that is what was typed", () => {
    // Both codes are in daily use in the West Bank. Rewriting one to the other
    // sends the code to a number the member does not hold.
    expect(toE164("+972599123456")).toBe("+972599123456");
    expect(toE164("00972 56 912 3456")).toBe("+972569123456");
  });

  it("honours the default country only when none was typed", () => {
    expect(toE164("0599123456", "972")).toBe("+972599123456");
    expect(toE164("+970599123456", "972")).toBe("+970599123456");
  });

  it("rejects what cannot be dialled", () => {
    expect(toE164("")).toBeNull();
    expect(toE164("abc")).toBeNull();
    expect(toE164("12345")).toBeNull();
    expect(toE164("+9705991234567890")).toBeNull();
  });

  it("is idempotent on its own output", () => {
    const once = toE164("0599123456");
    expect(once).not.toBeNull();
    expect(toE164(once as string)).toBe(once);
  });
});

describe("isE164", () => {
  it("accepts only normalised numbers", () => {
    expect(isE164("+970599123456")).toBe(true);
    expect(isE164("+972569123456")).toBe(true);
    expect(isE164("0599123456")).toBe(false);
    expect(isE164("+44599123456")).toBe(false);
    expect(isE164("+970 599123456")).toBe(false);
  });

  it("agrees with toE164 on everything toE164 produces", () => {
    for (const typed of ["0599123456", "+972569123456", "٠٥٦٩١٢٣٤٥٦", "0421234567"]) {
      const normalised = toE164(typed);
      if (normalised) expect(E164_PATTERN.test(normalised)).toBe(true);
    }
  });
});

describe("phoneTail", () => {
  it("shows four digits and no more", () => {
    expect(phoneTail("+970599123456")).toBe("3456");
  });
});
