import { LegalFooter } from "@palnet/ui-web";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import type { Locale } from "@/i18n";

export default async function LegalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: Locale }>;
}): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const prefix = `/${locale}`;

  return (
    <div className="bg-canvas min-h-screen pb-8">
      <header className="border-line-soft bg-surface border-b">
        <div className="mx-auto flex max-w-[1128px] items-center justify-between px-6 py-4">
          <a href={prefix} className="text-ink text-lg font-bold">
            {t("brand")}
          </a>
        </div>
      </header>
      {children}
      <LegalFooter
        label={t("footerLabel")}
        links={[
          { href: `${prefix}/terms`, label: t("terms.title") },
          { href: `${prefix}/privacy`, label: t("privacy.title") },
          { href: `${prefix}/community-guidelines`, label: t("community.title") },
        ]}
        copyright={t("copyright")}
      />
    </div>
  );
}
