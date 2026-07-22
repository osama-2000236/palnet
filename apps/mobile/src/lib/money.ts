import { formatCurrency, formatNumber } from "@baydar/shared";

// Billing used to format money by hand on the assumption Hermes lacks Intl. It
// doesn't — every other surface already formats through @baydar/shared — and
// the hand-rolled version printed Latin digits ("18₪") beside Arabic-Indic
// body text. Whole amounts drop the fraction, cent fractions keep two digits.
export function formatMoney(cents: number, currency: string, locale: string): string {
  const fraction = cents % 100 === 0 ? 0 : 2;
  return formatCurrency(cents / 100, currency, locale, {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  });
}

// dd/mm/yyyy — unambiguous in both ar and en; digits follow the locale.
export function formatDate(iso: string, locale: string): string {
  const date = new Date(iso);
  const part = (value: number): string => formatNumber(value, locale, { useGrouping: false });
  return `${part(date.getDate())}/${part(date.getMonth() + 1)}/${part(date.getFullYear())}`;
}
