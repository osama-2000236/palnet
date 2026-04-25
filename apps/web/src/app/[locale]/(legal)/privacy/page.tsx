import type { Locale } from "@/i18n";

import { LegalDocument } from "../LegalDocument";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<JSX.Element> {
  const { locale } = await params;
  return <LegalDocument locale={locale} slug="privacy" />;
}
