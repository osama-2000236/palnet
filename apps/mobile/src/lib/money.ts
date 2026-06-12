// Hermes ships without full Intl, so billing surfaces format money by hand.
// Whole amounts drop the fraction (₪18, $5); cent fractions keep two digits.
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  ILS: "₪",
  EUR: "€",
  GBP: "£",
  JOD: "JD",
  AED: "AED",
  SAR: "SAR",
};

export function formatMoney(cents: number, currency: string): string {
  const amount = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()];
  if (!symbol) return `${amount} ${currency}`;
  return symbol.length === 1 ? `${symbol}${amount}` : `${symbol} ${amount}`;
}

// dd/mm/yyyy — unambiguous in both ar and en without relying on Intl.
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}
