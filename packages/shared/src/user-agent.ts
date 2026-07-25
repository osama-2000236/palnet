/**
 * Turn a raw user-agent string into something a person can recognise.
 *
 * The sessions list on `/settings/security` rendered `session.device`
 * verbatim, so the one screen where a user has to spot a device that is not
 * theirs was a wall of
 * "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like
 * Gecko) Chrome/141.0.0.0 Safari/537.36". Nobody audits that. "Chrome · Windows"
 * they can audit.
 *
 * Deliberately a small ordered match rather than a UA-parsing dependency:
 * every browser lies about being every other browser in this string, so the
 * order is the logic. Edge claims Chrome and Safari; Chrome claims Safari;
 * Safari claims neither. Match most-specific first and stop.
 *
 * Returns null when nothing is recognised, so the caller can fall back to its
 * own "unknown device" copy rather than printing a half-parsed string.
 */
export function formatUserAgent(ua: string | null | undefined): string | null {
  if (!ua || !ua.trim()) return null;

  const browser = /\bEdg[A-Za-z]*\//.test(ua)
    ? "Edge"
    : /\bOPR\/|\bOpera\//.test(ua)
      ? "Opera"
      : /\bSamsungBrowser\//.test(ua)
        ? "Samsung Internet"
        : /\bFirefox\/|\bFxiOS\//.test(ua)
          ? "Firefox"
          : /\bChrome\/|\bCriOS\//.test(ua)
            ? "Chrome"
            : /\bSafari\//.test(ua)
              ? "Safari"
              : null;

  const os = /\bWindows NT\b/.test(ua)
    ? "Windows"
    : /\bAndroid\b/.test(ua)
      ? "Android"
      : /\b(iPhone|iPad|iPod)\b/.test(ua)
        ? "iOS"
        : /\bMac OS X\b|\bMacintosh\b/.test(ua)
          ? "macOS"
          : /\bCrOS\b/.test(ua)
            ? "ChromeOS"
            : /\bLinux\b/.test(ua)
              ? "Linux"
              : null;

  if (browser && os) return `${browser} · ${os}`;
  return browser ?? os;
}
