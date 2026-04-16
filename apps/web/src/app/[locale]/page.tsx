import { useTranslations } from "next-intl";

export default function LandingPage(): JSX.Element {
  const t = useTranslations("landing");
  return (
    <main className="mx-auto flex min-h-screen max-w-[1128px] flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-sans font-bold text-ink">{t("title")}</h1>
      <p className="max-w-xl text-ink-muted">{t("subtitle")}</p>
      <a
        href="/register"
        className="inline-flex items-center rounded-md bg-brand-600 px-6 py-3 text-white shadow-card hover:bg-brand-700"
      >
        {t("cta")}
      </a>
    </main>
  );
}
