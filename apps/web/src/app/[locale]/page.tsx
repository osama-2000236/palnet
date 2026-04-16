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
    <main className="mx-auto flex min-h-screen max-w-[1128px] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-sans font-bold text-ink">{t("title")}</h1>
      <p className="max-w-xl text-ink-muted">{t("subtitle")}</p>
      <Link
        href="/register"
        className="inline-flex items-center rounded-md bg-brand-600 px-6 py-3 text-white shadow-card hover:bg-brand-700"
      >
        {t("cta")}
      </Link>
    </main>
  );
}
