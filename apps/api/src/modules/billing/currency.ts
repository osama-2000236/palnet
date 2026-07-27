// USD-relative exchange-rate snapshot: the boot/fallback rates for
// FxService, which overlays live rates from FX_FEED_URL when configured.
// Each entry expresses "1 USD = N <currency>".
export const FX_TO_USD: Record<string, number> = {
  USD: 1,
  ILS: 3.6,
  JOD: 0.71,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
};

// Map a locale or country code to a sensible display currency. Falls back to
// USD when the user's locale is not in our table (diaspora-friendly default).
export function deriveDisplayCurrency(localeOrCountry: string | null | undefined): string {
  if (!localeOrCountry) return "USD";
  const upper = localeOrCountry.toUpperCase();
  if (upper.includes("PS") || upper.startsWith("AR-PS")) return "ILS";
  if (upper.includes("JO")) return "JOD";
  if (upper.includes("AE")) return "AED";
  if (upper.includes("SA")) return "SAR";
  if (upper.includes("EU") || upper.endsWith("-EU")) return "EUR";
  if (upper.includes("GB") || upper.includes("UK")) return "GBP";
  return "USD";
}
