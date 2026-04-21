import {
  formatCompact,
  formatCurrency,
  formatNumber,
  formatRelativeTime,
  formatSalaryRange,
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

describe("formatCompact", () => {
  it("compacts thousands in en", () => {
    expect(formatCompact(12000, "en")).toMatch(/12K/i);
  });

  it("compacts thousands in ar with Arabic digits", () => {
    const out = formatCompact(12000, "ar");
    // Should contain Arabic digits, not Latin "12".
    expect(out).not.toMatch(/[0-9]/);
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
