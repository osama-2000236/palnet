import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

import type { Locale } from "@/i18n";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  return (
    <main className="max-w-chrome mx-auto flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-ink font-sans text-4xl font-bold">{t("title")}</h1>
      <p className="text-ink-muted max-w-xl">{t("subtitle")}</p>
      <Link
        href="/register"
        className="bg-brand-600 text-ink-inverse shadow-card hover:bg-brand-700 inline-flex items-center rounded-md px-6 py-3"
      >
        {t("cta")}
      </Link>
    </main>
  );
}
