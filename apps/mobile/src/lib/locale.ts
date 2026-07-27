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
  // Baydar is Arabic-first: a build that ships EXPO_PUBLIC_DEFAULT_LOCALE (eas.json
  // sets ar-PS) opens in that language regardless of device language. The device
  // locale is only the dev fallback when the var is unset.
  const configured = process.env.EXPO_PUBLIC_DEFAULT_LOCALE;
  return (
    readWebPreference() ??
    readNativePreference() ??
    (configured ? normalizeLocale(configured) : deviceLocale())
  );
}

export async function writeLocalePreference(locale: SupportedLocale): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(KEY, locale);
    return;
  }
  await SecureStore.setItemAsync(KEY, locale);
}

// The locale this launch actually rendered with. I18nManager.isRTL is not a
// usable comparison here: forceRTL only lands on the next launch, so the JS
// flag and the native layout disagree for a whole session.
const bootLocale = getInitialLocale();

/** True when `locale` needs a restart to take effect (ar-PS and en differ in direction). */
export function needsRestartForDirection(locale: SupportedLocale): boolean {
  return locale !== bootLocale;
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
