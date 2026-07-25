import {
  formatCurrency,
  formatDate,
  formatMoney,
  formatNumber,
  formatRelativeTime,
  formatSalaryRange,
  localeTag,
} from "./format";

// Arabic-Indic reference digits for clarity in expectations.
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

describe("formatNumber", () => {
  it("renders Latin digits for en locale", () => {
    expect(formatNumber(1234, "en")).toBe("1,234");
  });

  it("renders Arabic-Indic digits for ar locale", () => {
    const out = formatNumber(1234, "ar");
    // Should contain Arabic-Indic digits; should not contain Latin 0-9.
    expect(out).not.toMatch(/[0-9]/);
    for (const ch of out) {
      if (/\p{Nd}/u.test(ch)) expect(AR_DIGITS).toContain(ch);
    }
  });

  it("renders Arabic-Indic digits for ar-PS locale", () => {
    const out = formatNumber(5, "ar-PS");
    expect(out).toBe("٥");
  });

  it("returns empty string for non-finite input", () => {
    expect(formatNumber(Number.NaN, "en")).toBe("");
    expect(formatNumber(Infinity, "en")).toBe("");
  });
});

describe("formatCurrency", () => {
  it("formats USD in English", () => {
    const out = formatCurrency(80000, "USD", "en-US");
    expect(out).toContain("80,000");
    expect(out).toContain("$");
  });

  it("uses Arabic-Indic digits for ar-PS", () => {
    const out = formatCurrency(80000, "USD", "ar-PS");
    expect(out).toContain("٨٠");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-04-21T12:00:00Z");

  it("returns 'now' for sub-minute diffs", () => {
    const then = new Date(now.getTime() - 10_000);
    const out = formatRelativeTime(then, "en", now);
    expect(out.toLowerCase()).toContain("now");
  });

  it("returns hours ago for same-day diffs", () => {
    const then = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const out = formatRelativeTime(then, "en", now);
    expect(out).toMatch(/3 hours ago/);
  });

  it("returns Arabic phrasing for ar locale", () => {
    const then = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const out = formatRelativeTime(then, "ar", now);
    // Should not contain Latin digits.
    expect(out).not.toMatch(/[0-9]/);
    // Should contain Arabic script.
    expect(out).toMatch(/[\u0600-\u06ff]/);
  });

  // Hermes (React Native) ships without Intl.RelativeTimeFormat, so every
  // timestamp in the mobile app takes this path.
  //
  // This test previously asserted the hand-rolled fallback: "3 hours ago" and
  // an Arabic string containing "قبل". That output was verified wrong on a real
  // device — three days rendered "قبل ٣ يوم", a plural count against a singular
  // noun. Arabic pluralises across six categories (٣ أيام, ١١ يومًا) and 1/2
  // days are أمس / أول أمس rather than counted phrases at all, so no
  // `${count} ${noun}` template can be right.
  it("degrades to an absolute date when RelativeTimeFormat is unavailable", () => {
    const original = Intl.RelativeTimeFormat;
    Object.defineProperty(Intl, "RelativeTimeFormat", {
      configurable: true,
      value: undefined,
    });

    try {
      const then = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const ar = formatRelativeTime(then, "ar", now);
      expect(ar).not.toContain("قبل");
      expect(ar).not.toContain("٣ يوم");
      // An absolute date is always grammatical, and still digit-correct.
      expect(ar).toMatch(/[٠-٩]/);
      expect(ar).not.toMatch(/[0-9]/);

      expect(formatRelativeTime(then, "en", now)).not.toContain("ago");
    } finally {
      Object.defineProperty(Intl, "RelativeTimeFormat", {
        configurable: true,
        value: original,
      });
    }
  });

  it("falls back to date string for >30 days", () => {
    const then = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const out = formatRelativeTime(then, "en-US", now);
    expect(out).toMatch(/202\d/); // year appears in medium date style
  });

  it("returns empty string for invalid date", () => {
    expect(formatRelativeTime("not-a-date", "en", now)).toBe("");
  });
});

describe("formatSalaryRange", () => {
  it("returns null when both bounds are null", () => {
    expect(formatSalaryRange(null, null, "USD", "en")).toBeNull();
  });

  it("returns single value when only min given", () => {
    const out = formatSalaryRange(50000, null, "USD", "en-US");
    expect(out).toContain("50,000");
    expect(out).not.toContain("–");
  });

  it("returns range when both bounds given", () => {
    const out = formatSalaryRange(80000, 120000, "USD", "en-US");
    expect(out).toContain("80,000");
    expect(out).toContain("120,000");
    expect(out).toContain("–");
  });
});

describe("formatMoney", () => {
  it("renders Arabic-Indic digits in ar-PS", () => {
    const price = formatMoney(1800, "ILS", "ar-PS");
    expect(price).toMatch(/[٠-٩]/);
    expect(price).not.toMatch(/[0-9]/);
  });

  it("keeps Latin digits in en and shows cents only when there are any", () => {
    expect(formatMoney(500, "USD", "en")).toBe("$5");
    expect(formatMoney(1250, "USD", "en")).toBe("$12.50");
  });
});

describe("formatDate", () => {
  it("localises the digits but keeps d/m/y order in both locales", () => {
    expect(formatDate("2026-07-22T00:00:00.000Z", "en")).toBe("22/7/2026");
    const ar = formatDate("2026-07-22T00:00:00.000Z", "ar-PS");
    expect(ar).toMatch(/[٠-٩]/);
    expect(ar).not.toMatch(/[0-9]/);
    // No thousands separator inside the year.
    expect(ar).toBe("٢٢/٧/٢٠٢٦");
  });
});

describe("localeTag", () => {
  it("forces Arabic-Indic digits for ar locales and leaves others alone", () => {
    expect(localeTag("ar-PS")).toBe("ar-PS-u-nu-arab");
    expect(localeTag("en")).toBe("en");
    // The reason it exists: a bare locale gives Latin digits in Arabic pages.
    const dated = new Intl.DateTimeFormat(localeTag("ar-PS"), { dateStyle: "medium" }).format(
      new Date("2026-07-22T00:00:00.000Z"),
    );
    expect(dated).not.toMatch(/[0-9]/);
  });
});
