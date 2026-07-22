import { formatDate, formatMoney } from "@/lib/money";

const LATIN_DIGIT = /[0-9]/;
const ARABIC_INDIC_DIGIT = /[٠-٩]/;

describe("money formatting", () => {
  it("renders Arabic-Indic digits in ar-PS", () => {
    const price = formatMoney(1800, "ILS", "ar-PS");
    expect(price).toMatch(ARABIC_INDIC_DIGIT);
    expect(price).not.toMatch(LATIN_DIGIT);

    const date = formatDate("2026-07-22T00:00:00.000Z", "ar-PS");
    expect(date).toMatch(ARABIC_INDIC_DIGIT);
    expect(date).not.toMatch(LATIN_DIGIT);
  });

  it("keeps Latin digits in en and shows cents only when there are any", () => {
    expect(formatMoney(500, "USD", "en")).toBe("$5");
    expect(formatMoney(1250, "USD", "en")).toBe("$12.50");
  });
});
