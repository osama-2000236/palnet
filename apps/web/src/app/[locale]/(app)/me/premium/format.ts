// Money display for billing surfaces. Whole amounts drop the fraction
// (₪18, $5) — cent fractions only appear when the converted amount has them.
export function formatMoney(cents: number, currency: string, locale: string): string {
  const hasFraction = cents % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(cents / 100);
}
