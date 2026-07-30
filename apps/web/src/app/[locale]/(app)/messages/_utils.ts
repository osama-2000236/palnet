import { localeTag } from "@baydar/shared";

// Message state, the typing constants and `shortTime` live in
// `@baydar/shared/messaging` — mobile had its own copy of all four. What is
// left here is web-only presentation: the inbox row's "last message at" and
// the thread's day separator, neither of which mobile draws this way.

export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function shortDate(iso: string, locale: string): string {
  const date = new Date(iso);
  // `toLocale*` renders the literal "Invalid Date" rather than throwing, so the
  // try/catch below (which is there for a malformed locale tag) never saw it.
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleString(localeTag(locale), {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function shortDayLabel(iso: string, locale: string): string {
  const date = new Date(iso);
  // `toLocale*` renders the literal "Invalid Date" rather than throwing, so the
  // try/catch below (which is there for a malformed locale tag) never saw it.
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString(localeTag(locale), {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
