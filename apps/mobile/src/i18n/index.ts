// Hermes ships without `Intl.PluralRules`, so i18next falls back to the
// legacy `compatibilityJSON v3` format with a noisy console.error. Pull in
// the polyfill before i18next initialises.
import "intl-pluralrules";

import { formatNumber } from "@baydar/shared";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  applyLocaleDirection,
  getInitialLocale,
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
  interpolation: {
    escapeValue: false,
    alwaysFormat: true,
    // Digit-script policy (packages/shared/src/format.ts): Arabic locales
    // render Arabic-Indic digits. Route every interpolated number through it.
    format: (value, _format, lng) =>
      typeof value === "number" ? formatNumber(value, lng ?? "ar-PS") : (value as string),
  },
  returnNull: false,
});

// Strings swap immediately; layout direction only takes effect on the next
// launch because I18nManager.forceRTL is applied natively at startup.
export async function setAppLocale(locale: SupportedLocale): Promise<void> {
  await writeLocalePreference(locale);
  applyLocaleDirection(locale);
  await i18n.changeLanguage(locale);
}

export default i18n;
