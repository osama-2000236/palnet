import { LegalPage } from "../legal-copy";

export default function Page({ params }: { params: { locale: string } }): JSX.Element {
  return <LegalPage kind="privacy" locale={params.locale} />;
}
