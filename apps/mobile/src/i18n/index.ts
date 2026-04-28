// Hermes ships without `Intl.PluralRules`, so i18next falls back to the
// legacy `compatibilityJSON v3` format with a noisy console.error. Pull in
// the polyfill before i18next initialises.
import "intl-pluralrules";

import * as Localization from "expo-localization";
import i18n from "i18next";
import { I18nManager } from "react-native";
import { initReactI18next } from "react-i18next";

import ar from "./ar.json";
import en from "./en.json";

type Supported = "ar-PS" | "en";

function pickLocale(): Supported {
  const tag = Localization.getLocales()[0]?.languageTag ?? "ar-PS";
  if (tag.startsWith("ar")) return "ar-PS";
  if (tag.startsWith("en")) return "en";
  return "ar-PS";
}

const locale = pickLocale();

// RTL for Arabic. Native side needs a reload if this flips vs. current runtime.
const shouldBeRtl = locale === "ar-PS";
if (I18nManager.isRTL !== shouldBeRtl) {
  I18nManager.allowRTL(shouldBeRtl);
  I18nManager.forceRTL(shouldBeRtl);
  // Caller should restart the app on first boot after locale change.
}

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

export default i18n;
