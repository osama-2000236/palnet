import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { locales, localeDir, type Locale } from "@/i18n";

import "../globals.css";

const sansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-arabic",
  display: "swap",
});

const bodyArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-naskh",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Baydar — بيدر",
  description: "شبكة عربية مهنية — حيث يلتقي أثرك بفرصتك.",
};

export function generateStaticParams(): Array<{ locale: Locale }> {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout(props: {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}): Promise<JSX.Element> {
  const { locale } = await props.params;
  if (!locales.includes(locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = localeDir[locale];

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${sansArabic.variable} ${bodyArabic.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {props.children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
