import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { locales, type Locale } from "@/i18n";
import { QueryProvider } from "@/lib/query-provider";
import { ThemeProvider } from "@/lib/theme-provider";
import { ToastBridge } from "@/components/ToastBridge";

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
  await connection();

  const { locale } = await props.params;
  if (!locales.includes(locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <ThemeProvider>
        <QueryProvider>
          <ToastBridge>{props.children}</ToastBridge>
        </QueryProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
