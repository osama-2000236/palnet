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
 * The BCP-47 tag to hand `Intl.DateTimeFormat` / `toLocaleDateString` so digits
 * match the surrounding script. Node's ICU defaults "ar" to latn, and unlike
 * NumberFormat these constructors don't expose `numberingSystem` in the TS
 * types — the `-u-nu-arab` unicode extension is the way in, and it is accepted
 * at runtime by every Intl constructor.
 *
 * Any date rendered with a bare `locale` shows Latin digits in Arabic pages.
 */
export function localeTag(locale: string | undefined | null): string {
  const resolved = resolveLocale(locale);
  return isArabicLocale(locale) ? `${resolved}-u-nu-arab` : resolved;
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
 * Format a cent amount for billing surfaces. Whole amounts drop the fraction
 * (₪18, $5); cent fractions keep two digits. Web and mobile both render money
 * through this — they used to keep separate copies, and the mobile one printed
 * Latin digits into Arabic pages.
 */
export function formatMoney(cents: number, currency: string, locale: string): string {
  const fraction = cents % 100 === 0 ? 0 : 2;
  return formatCurrency(cents / 100, currency, locale, {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  });
}

/**
 * d/m/y — deliberately not `dateStyle`, which would render en as month-first.
 * The fixed order is unambiguous in both locales; only the digits localise.
 */
export function formatDate(iso: string | Date, locale: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  const part = (value: number): string => formatNumber(value, locale, { useGrouping: false });
  return `${part(date.getDate())}/${part(date.getMonth() + 1)}/${part(date.getFullYear())}`;
}

type RelativeUnit = "year" | "month" | "week" | "day" | "hour" | "minute" | "second";

const RELATIVE_UNITS: Array<{ unit: RelativeUnit; secs: number }> = [
  { unit: "year", secs: 60 * 60 * 24 * 365 },
  { unit: "month", secs: 60 * 60 * 24 * 30 },
  { unit: "week", secs: 60 * 60 * 24 * 7 },
  { unit: "day", secs: 60 * 60 * 24 },
  { unit: "hour", secs: 60 * 60 },
  { unit: "minute", secs: 60 },
  { unit: "second", secs: 1 },
];

function formatAbsoluteDateFallback(value: Date, locale: string): string {
  const tag = localeTag(locale);
  try {
    return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(value);
  } catch {
    try {
      return value.toLocaleDateString(resolveLocale(locale));
    } catch {
      return value.toISOString().slice(0, 10);
    }
  }
}

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

  const tag = localeTag(locale);

  // Hermes ships without Intl.RelativeTimeFormat, so React Native lands here.
  // Do NOT hand-roll the relative phrasing: Arabic pluralises across six
  // categories (٣ أيام but ١١ يومًا, and 1/2 days are أمس/أول أمس, not "قبل ١
  // يوم"), and a naive `${count} ${noun}` template gets every one of them wrong.
  // Intl.DateTimeFormat *is* present, and an absolute date is always
  // grammatical, so degrade to that rather than to broken Arabic.
  if (typeof Intl.RelativeTimeFormat !== "function") {
    return formatAbsoluteDateFallback(then, locale);
  }

  if (absSecs < 60) {
    // "now" / "الآن" — RelativeTimeFormat's "0 seconds" reads awkwardly.
    return new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(0, "second");
  }

  // Fall back to absolute date for anything older than 30 days.
  const DAYS_30 = 60 * 60 * 24 * 30;
  if (absSecs > DAYS_30) {
    return formatAbsoluteDateFallback(then, locale);
  }

  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  for (const { unit, secs } of RELATIVE_UNITS) {
    if (absSecs >= secs) {
      // RelativeTimeFormat expects past = negative.
      return rtf.format(-Math.round(diffSecs / secs), unit);
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
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;

  if (!hasMin && !hasMax) return null;
  if (hasMin && hasMax) {
    return `${formatCurrency(min, currency, locale)} – ${formatCurrency(max, currency, locale)}`;
  }
  if (hasMin) return formatCurrency(min, currency, locale);
  if (hasMax) return formatCurrency(max, currency, locale);
  return null;
}
