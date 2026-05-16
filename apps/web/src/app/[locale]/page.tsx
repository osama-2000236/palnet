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
      <h1 className="text-ink font-sans text-4xl font-bold">{t("title")}</h1>
      <p className="text-ink-muted max-w-xl">{t("subtitle")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={`/${locale}/register`}
          className="bg-brand-600 text-ink-inverse shadow-card hover:bg-brand-700 inline-flex items-center rounded-md px-6 py-3 font-semibold"
        >
          {t("cta")}
        </Link>
        <Link
          href={`/${locale}/login`}
          className="border-line-hard text-ink hover:bg-surface-subtle inline-flex items-center rounded-md border bg-transparent px-6 py-3 font-semibold"
        >
          {t("login")}
        </Link>
      </div>
      <p className="text-ink-muted text-sm">{t("haveAccount")}</p>
    </main>
  );
}
