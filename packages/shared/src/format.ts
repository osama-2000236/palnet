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

// ── Relative-time fallback for engines without Intl.RelativeTimeFormat ──────
//
// Hermes is that engine, so every timestamp in the React Native app comes
// through here. It *does* have Intl.PluralRules (apps/mobile pulls in
// `intl-pluralrules`), which is the hard part of Arabic: six categories, and
// the noun changes in each — ٣ أيام but ١١ يومًا, and one/two drop the numeral
// entirely.
//
// The tables below are CLDR's own, transcribed from
// Intl.RelativeTimeFormat(numeric:"auto") output. format.spec.ts asserts they
// still match it across the whole reachable range, so they cannot drift.

type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const AR_UNITS: Record<RelativeUnit, PluralForms> = {
  second: { one: "ثانية واحدة", two: "ثانيتين", few: "{n} ثوانِ", other: "{n} ثانية" },
  minute: { one: "دقيقة واحدة", two: "دقيقتين", few: "{n} دقائق", other: "{n} دقيقة" },
  hour: { one: "ساعة واحدة", two: "ساعتين", few: "{n} ساعات", other: "{n} ساعة" },
  day: { one: "يوم واحد", two: "يومين", few: "{n} أيام", many: "{n} يومًا", other: "{n} يوم" },
  week: {
    one: "أسبوع واحد",
    two: "أسبوعين",
    few: "{n} أسابيع",
    many: "{n} أسبوعًا",
    other: "{n} أسبوع",
  },
  month: { one: "شهر واحد", two: "شهرين", few: "{n} أشهر", many: "{n} شهرًا", other: "{n} شهر" },
  year: { one: "سنة واحدة", two: "سنتين", few: "{n} سنوات", other: "{n} سنة" },
};

const EN_UNITS: Record<RelativeUnit, { one: string; other: string }> = {
  second: { one: "{n} second", other: "{n} seconds" },
  minute: { one: "{n} minute", other: "{n} minutes" },
  hour: { one: "{n} hour", other: "{n} hours" },
  day: { one: "{n} day", other: "{n} days" },
  week: { one: "{n} week", other: "{n} weeks" },
  month: { one: "{n} month", other: "{n} months" },
  year: { one: "{n} year", other: "{n} years" },
};

/** Idiomatic names CLDR prefers over a counted phrase, past direction only. */
const AR_NAMED_PAST: Partial<Record<string, string>> = {
  "day:1": "أمس",
  "day:2": "أول أمس",
  "week:1": "الأسبوع الماضي",
  "month:1": "الشهر الماضي",
  "year:1": "السنة الماضية",
};
const EN_NAMED_PAST: Partial<Record<string, string>> = {
  "day:1": "yesterday",
  "week:1": "last week",
  "month:1": "last month",
  "year:1": "last year",
};

function pluralCategory(amount: number, locale: string): Intl.LDMLPluralRule {
  if (typeof Intl.PluralRules !== "function") return amount === 1 ? "one" : "other";
  return new Intl.PluralRules(resolveLocale(locale)).select(amount);
}

/**
 * `value` is negative for the past, matching Intl.RelativeTimeFormat.
 * Only the past direction is reachable from formatRelativeTime today; future
 * timestamps fall through to the counted phrase, which is still correct.
 */
function formatRelativeFallback(value: number, unit: RelativeUnit, locale: string): string {
  const amount = Math.abs(value);
  const past = value < 0;
  const arabic = isArabicLocale(locale);

  // CLDR names the zero point rather than counting it.
  if (amount === 0 && unit === "second") return arabic ? "الآن" : "now";

  if (past) {
    const named = (arabic ? AR_NAMED_PAST : EN_NAMED_PAST)[`${unit}:${amount}`];
    if (named) return named;
  }

  const count = formatNumber(amount, locale);
  if (arabic) {
    const forms = AR_UNITS[unit];
    const body = (forms[pluralCategory(amount, locale)] ?? forms.other).replace("{n}", count);
    return `${past ? "قبل" : "خلال"} ${body}`;
  }

  const forms = EN_UNITS[unit];
  const body = (amount === 1 ? forms.one : forms.other).replace("{n}", count);
  return past ? `${body} ago` : `in ${body}`;
}

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

  const hasRtf = typeof Intl.RelativeTimeFormat === "function";

  if (absSecs < 60) {
    // "now" / "الآن" — RelativeTimeFormat's "0 seconds" reads awkwardly.
    return hasRtf
      ? new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(0, "second")
      : formatRelativeFallback(0, "second", locale);
  }

  // Fall back to absolute date for anything older than 30 days.
  const DAYS_30 = 60 * 60 * 24 * 30;
  if (absSecs > DAYS_30) {
    return formatAbsoluteDateFallback(then, locale);
  }

  const rtf = hasRtf ? new Intl.RelativeTimeFormat(tag, { numeric: "auto" }) : null;
  for (const { unit, secs } of RELATIVE_UNITS) {
    if (absSecs >= secs) {
      // RelativeTimeFormat expects past = negative.
      const value = -Math.round(diffSecs / secs);
      return rtf ? rtf.format(value, unit) : formatRelativeFallback(value, unit, locale);
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

/**
 * Wrap a figure in a Unicode LTR isolate so bidi cannot reorder it: an RTL
 * paragraph otherwise renders "+50" as "50+". Android ignores
 * `writingDirection`, so the direction must travel with the string.
 * ui-native keeps a private copy (it may not import this package).
 * Not a cure-all: Arabic-Indic digits are class AN, so an isolated "٣ / ٥"
 * still paints "٥ / ٣" — write ratios unspaced. See ui-web/src/ScoreBar.tsx.
 */
export function ltrIsolate(text: string): string {
  return `${String.fromCharCode(0x2066)}${text}${String.fromCharCode(0x2069)}`;
}
