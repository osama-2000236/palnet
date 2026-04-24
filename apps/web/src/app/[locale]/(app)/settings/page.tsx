import { redirect } from "next/navigation";

import type { Locale } from "@/i18n";

export default async function SettingsIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/settings/account`);
}
