import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { I18nManager, Platform } from "react-native";

export type SupportedLocale = "ar-PS" | "en";
export type Locale = SupportedLocale;

const KEY = "baydar.locale.v1";

type WebStorage = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

function getWebStorage(): WebStorage | null {
  return (globalThis as typeof globalThis & { localStorage?: WebStorage }).localStorage ?? null;
}

export function normalizeLocale(tag: string | null | undefined): SupportedLocale {
  if (!tag) return "ar-PS";
  return tag.toLowerCase().startsWith("en") ? "en" : "ar-PS";
}

export function deviceLocale(): SupportedLocale {
  return normalizeLocale(Localization.getLocales()[0]?.languageTag);
}

function readWebPreference(): SupportedLocale | null {
  if (Platform.OS !== "web") return null;
  try {
    const raw = getWebStorage()?.getItem(KEY);
    return raw ? normalizeLocale(raw) : null;
  } catch {
    return null;
  }
}

function readNativePreference(): SupportedLocale | null {
  if (Platform.OS === "web") return null;
  try {
    const raw = SecureStore.getItem(KEY);
    return raw ? normalizeLocale(raw) : null;
  } catch {
    return null;
  }
}

// Must stay synchronous: i18n and I18nManager.forceRTL both run at module
// import, before the first render. An async read lands too late and the app
// boots in the device language with the wrong layout direction.
export function getInitialLocale(): SupportedLocale {
  return readWebPreference() ?? readNativePreference() ?? deviceLocale();
}

export async function readLocalePreference(): Promise<SupportedLocale | null> {
  if (Platform.OS === "web") return readWebPreference();
  const raw = await SecureStore.getItemAsync(KEY).catch(() => null);
  return raw ? normalizeLocale(raw) : null;
}

export async function writeLocalePreference(locale: SupportedLocale): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(KEY, locale);
    return;
  }
  await SecureStore.setItemAsync(KEY, locale);
}

// Captured at import, before applyLocaleDirection mutates the flag. Android
// keeps the native direction until the next launch, so this — not the live
// I18nManager value — is the direction the current session actually renders in.
const bootIsRTL = I18nManager.isRTL;

/** True when `locale` disagrees with the direction this launch rendered in. */
export function needsRestartForDirection(locale: SupportedLocale): boolean {
  return bootIsRTL !== (locale === "ar-PS");
}

export function applyLocaleDirection(locale: SupportedLocale): void {
  const isRtl = locale === "ar-PS";
  I18nManager.allowRTL(isRtl);
  I18nManager.forceRTL(isRtl);

  const documentRef = (
    globalThis as typeof globalThis & {
      document?: { documentElement?: { dir: string; lang: string } };
    }
  ).document;
  if (documentRef?.documentElement) {
    documentRef.documentElement.dir = isRtl ? "rtl" : "ltr";
    documentRef.documentElement.lang = locale;
  }
}
