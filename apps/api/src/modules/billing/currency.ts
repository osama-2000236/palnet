import type { WalletProvider } from "@baydar/shared";

// USD-relative exchange-rate snapshot. TODO: replace with a live rate feed
// (openexchangerates / fixer.io) post-beta; for the MVP we ship hardcoded
// rates updated by hand and acknowledged at staging/prod boot via env or a
// future admin endpoint. Each entry expresses "1 USD = N <currency>".
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

// Pure helper: convert an integer cent amount from one currency to another
// using FX_TO_USD. Banker's rounding via Math.round on the final cent count.
export function convertCents(amountCents: number, from: string, to: string): number {
  if (from === to) return amountCents;
  const fromRate = FX_TO_USD[from.toUpperCase()];
  const toRate = FX_TO_USD[to.toUpperCase()];
  if (!fromRate || !toRate) return amountCents; // unknown currencies — no-op.
  const usd = amountCents / fromRate;
  return Math.round(usd * toRate);
}

export const WALLET_PROVIDERS: ReadonlyArray<WalletProvider> = ["JAWWALPAY", "PALPAY", "REFLECT"];
