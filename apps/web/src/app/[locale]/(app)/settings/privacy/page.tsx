// Settings → Privacy. Read-only, on purpose.
//
// This page used to render an editable form against `GET/PATCH /me/privacy`.
// That endpoint has never existed in `apps/api` — there is no privacy
// controller, no Prisma column, nothing on the server — so every visit resolved
// to the retry state ("حدث خطأ في الخادم") and no setting was ever changeable.
// The native twin (`apps/mobile/app/(app)/settings/privacy.tsx`) has always
// shipped the honest version: the privacy contract as it actually behaves, a
// notice that the controls are not wired yet, and a disabled save. This is that
// screen, so the two platforms say the same thing.
//
// When the API lands, this page grows the RadioGroup/Switch form back — the
// message keys for the states below are the contract it has to honour.

import { Banner, Button, Chip, Surface } from "@baydar/ui-web";
import { useTranslations } from "next-intl";

const ROWS = ["profile", "messages", "search"] as const;

export default function PrivacySettingsPage(): JSX.Element {
  const t = useTranslations("settings.privacy");
  const tCommon = useTranslations("common");

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("subtitle")}</p>
      </header>

      <Banner kind="warning">{t("noticeBody")}</Banner>

      <Surface variant="card" padding="0">
        <ul>
          {ROWS.map((row, index) => (
            <li
              key={row}
              className={
                "flex flex-col items-start gap-3 px-4 py-4" +
                (index > 0 ? " border-line-soft border-t" : "")
              }
            >
              <div>
                <div className="text-ink text-sm font-semibold">{t(`rows.${row}.title`)}</div>
                <div className="text-ink-muted mt-0.5 text-xs">{t(`rows.${row}.body`)}</div>
              </div>
              <Chip active>{t(`rows.${row}.state`)}</Chip>
            </li>
          ))}
        </ul>
      </Surface>

      <p className="text-ink-subtle text-xs">{t("disabledHint")}</p>
      <Button variant="secondary" disabled fullWidth>
        {tCommon("save")}
      </Button>
    </main>
  );
}
