import type { Locale } from "@/i18n";

import { LegalDocument } from "../LegalDocument";

export default async function CommunityGuidelinesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<JSX.Element> {
  const { locale } = await params;
  return <LegalDocument locale={locale} slug="community" />;
}
