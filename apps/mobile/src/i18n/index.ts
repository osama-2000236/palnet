// Hermes ships without `Intl.PluralRules`, so i18next falls back to the
// legacy `compatibilityJSON v3` format with a noisy console.error. Pull in
// the polyfill before i18next initialises.
import "intl-pluralrules";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  applyLocaleDirection,
  getInitialLocale,
  readLocalePreference,
  writeLocalePreference,
  type SupportedLocale,
} from "@/lib/locale";

import ar from "./ar.json";
import en from "./en.json";

const locale = getInitialLocale();
applyLocaleDirection(locale);

void i18n.use(initReactI18next).init({
  resources: {
    "ar-PS": { translation: ar },
    en: { translation: en },
  },
  lng: locale,
  fallbackLng: "ar-PS",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export async function setAppLocale(locale: SupportedLocale): Promise<void> {
  await writeLocalePreference(locale);
  applyLocaleDirection(locale);
  await i18n.changeLanguage(locale);
}

export async function loadStoredAppLocale(): Promise<void> {
  const stored = await readLocalePreference();
  if (stored && stored !== i18n.language) {
    await setAppLocale(stored);
  }
}

export default i18n;
