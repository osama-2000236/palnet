import { Button, Surface } from "@baydar/ui-web";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function LocaleNotFound(): Promise<JSX.Element> {
  const t = await getTranslations("errors.notFound");
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-6 py-12">
      <Surface
        variant="tinted"
        padding="8"
        className="flex flex-col items-center gap-4 text-center"
      >
        <span className="text-brand-700 font-mono text-3xl font-bold">404</span>
        <h1 className="text-ink text-xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("body")}</p>
        <Link href="/">
          <Button variant="primary" size="md">
            {t("home")}
          </Button>
        </Link>
      </Surface>
    </main>
  );
}
