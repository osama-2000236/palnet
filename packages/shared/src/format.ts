// Locale-aware number, currency, and relative-time formatters.
//
// Digit-script policy: Arabic locales render Arabic-Indic digits
// (٠١٢٣٤٥٦٧٨٩) via the `ar` / `ar-*` BCP-47 tags. English falls back
// to Latin digits. We always pass an explicit locale so rendering is
// deterministic on server + client + native.

export type SupportedLocale = "ar" | "ar-PS" | "en" | "en-US";

function resolveLocale(locale: string | undefined | null): string {
  if (!locale) return "en";
  return locale;
}

function isArabicLocale(locale: string | undefined | null): boolean {
  if (!locale) return false;
  const lower = locale.toLowerCase();
  return lower === "ar" || lower.startsWith("ar-");
}

/**
 * Merge Arabic-Indic numbering system into options for ar-* locales.
 * Node's default ICU data ships "latn" as the default for "ar", which
 * would render "1,234" in otherwise-Arabic output. Force "arab" so
 * numerals match the surrounding script.
 */
function withDigits(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormatOptions {
  if (isArabicLocale(locale)) {
    return { numberingSystem: "arab", ...options };
  }
  return options ?? {};
}

/**
 * Format an integer or decimal for display. Uses Arabic-Indic digits
 * for Arabic locales, Latin digits otherwise.
 */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat(resolveLocale(locale), withDigits(locale, options)).format(value);
}

/**
 * Format a currency amount. Callers must pass an ISO 4217 code
 * (e.g. "USD", "ILS", "JOD"). Symbol placement follows locale.
 */
export function formatCurrency(
  value: number,
  currency: string,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat(
    resolveLocale(locale),
    withDigits(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      ...options,
    }),
  ).format(value);
}

/**
 * Compact counts like "1.2k" or "١٫٢ ألف" for feed stats.
 */
export function formatCompact(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat(
    resolveLocale(locale),
    withDigits(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }),
  ).format(value);
}

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; secs: number }> = [
  { unit: "year", secs: 60 * 60 * 24 * 365 },
  { unit: "month", secs: 60 * 60 * 24 * 30 },
  { unit: "week", secs: 60 * 60 * 24 * 7 },
  { unit: "day", secs: 60 * 60 * 24 },
  { unit: "hour", secs: 60 * 60 },
  { unit: "minute", secs: 60 },
  { unit: "second", secs: 1 },
];

/**
 * Format an ISO timestamp as a relative string ("3 hours ago" / "قبل ٣ ساعات").
 * Falls back to a locale date string for values older than 30 days.
 */
export function formatRelativeTime(
  iso: string | Date,
  locale: string,
  now: Date = new Date(),
): string {
  const then = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(then.getTime())) return "";

  const diffSecs = Math.round((now.getTime() - then.getTime()) / 1000);
  const absSecs = Math.abs(diffSecs);

  // BCP-47 unicode extension `-u-nu-arab` forces Arabic-Indic digits
  // for Intl formatters that don't expose `numberingSystem` in TS types
  // (RelativeTimeFormat, DateTimeFormat — both accept it at runtime).
  const tag = isArabicLocale(locale) ? `${resolveLocale(locale)}-u-nu-arab` : resolveLocale(locale);

  if (absSecs < 60) {
    // "now" / "الآن" — RelativeTimeFormat's "0 seconds" reads awkwardly.
    return new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(0, "second");
  }

  // Fall back to absolute date for anything older than 30 days.
  const DAYS_30 = 60 * 60 * 24 * 30;
  if (absSecs > DAYS_30) {
    return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(then);
  }

  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  for (const { unit, secs } of RELATIVE_UNITS) {
    if (absSecs >= secs) {
      const value = Math.round(diffSecs / secs);
      // RelativeTimeFormat expects past = negative.
      return rtf.format(-value, unit);
    }
  }
  return "";
}

/**
 * Format a salary range for job cards. Returns a single localized string
 * like "$80,000 – $120,000" or "٨٠٬٠٠٠ – ١٢٠٬٠٠٠ د.أ". Either bound can
 * be null; returns null if both are missing.
 */
export function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string,
  locale: string,
): string | null {
  if (min === null || min === undefined) {
    if (max === null || max === undefined) return null;
    return formatCurrency(max, currency, locale);
  }
  if (max === null || max === undefined) {
    return formatCurrency(min, currency, locale);
  }
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `${formatCurrency(min, currency, locale)} – ${formatCurrency(max, currency, locale)}`;
  }
  return null;
}
