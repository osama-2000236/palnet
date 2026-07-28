// City + country display, shared by the web and native company screens.
//
// Its own module rather than another entry in format.ts, which is at the 300-LOC
// route cap that `qa:design` enforces.

function isArabicLocale(locale: string | undefined | null): boolean {
  if (!locale) return false;
  const lower = locale.toLowerCase();
  return lower === "ar" || lower.startsWith("ar-");
}

/**
 * Names we pin instead of asking `Intl.DisplayNames`.
 *
 * `Intl.DisplayNames("PS")` is not one answer: Node's ICU returns "الأراضي
 * الفلسطينية" / "Palestinian Territories", Chrome's returns "فلسطين" /
 * "Palestine", and Hermes may not implement `DisplayNames` at all. The same
 * company page therefore rendered a different country on the server, in the
 * browser and on the phone.
 *
 * PS is also the one name this product does not get to leave to a library.
 */
const PINNED: Record<string, { ar: string; en: string }> = {
  PS: { ar: "فلسطين", en: "Palestine" },
};

function regionName(country: string, locale: string): string {
  const pinned = PINNED[country.toUpperCase()];
  if (pinned) return isArabicLocale(locale) ? pinned.ar : pinned.en;
  try {
    return new Intl.DisplayNames([locale || "en"], { type: "region" }).of(country) ?? country;
  } catch {
    // No DisplayNames (Hermes) or no region data — the bare code is what native
    // displayed before this function existed.
    return country;
  }
}

/**
 * "رام الله، فلسطين" / "Ramallah, Palestine" from a city plus an ISO 3166-1
 * alpha-2 code.
 *
 * Web resolved the region name inline on one route; native joined the raw code
 * with a Latin comma, so the mobile company page read "رام الله, PS".
 */
export function formatPlace(
  city: string | null | undefined,
  country: string | null | undefined,
  locale: string,
): string {
  const region = country ? regionName(country, locale) : "";
  return [city, region].filter(Boolean).join(isArabicLocale(locale) ? "، " : ", ");
}
