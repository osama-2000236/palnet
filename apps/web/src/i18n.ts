import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

export const locales = ["ar-PS", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar-PS";

export const localeDir: Record<Locale, "rtl" | "ltr"> = {
  "ar-PS": "rtl",
  en: "ltr",
};

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();
  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
