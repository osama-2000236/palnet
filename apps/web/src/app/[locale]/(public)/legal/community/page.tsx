import { LegalPage } from "../legal-copy";

export default async function Page({
  params,
}: {
  params: { locale: string };
}): Promise<JSX.Element> {
  const locale = (await params).locale;
  return <LegalPage kind="community" locale={locale} />;
}
