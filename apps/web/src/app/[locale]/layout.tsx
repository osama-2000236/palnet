import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { locales, localeDir, type Locale } from "@/i18n";

import "../globals.css";

export const metadata: Metadata = {
  title: "PalNet",
  description: "Palestine's professional network.",
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

  const messages = await getMessages();
  const dir = localeDir[locale];

  return (
    <html lang={locale} dir={dir}>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {props.children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
