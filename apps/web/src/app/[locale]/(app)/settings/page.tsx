"use client";

import { Surface } from "@baydar/ui-web";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function SettingsLandingPage(): JSX.Element {
  const t = useTranslations("settings");
  const tMe = useTranslations("me.tabs");
  const locale = useLocale();
  const items = [
    {
      href: `/${locale}/settings/account`,
      label: t("items.account"),
      desc: t("items.accountDesc"),
    },
    {
      href: `/${locale}/settings/notifications`,
      label: t("items.notifications"),
      desc: t("items.notificationsDesc"),
    },
    {
      href: `/${locale}/settings/appearance`,
      label: t("items.appearance"),
      desc: t("items.appearanceDesc"),
    },
    {
      href: `/${locale}/settings/privacy`,
      label: t("items.privacy"),
      desc: t("items.privacyDesc"),
    },
    {
      href: `/${locale}/settings/verification`,
      label: t("items.verification"),
      desc: t("items.verificationDesc"),
    },
    {
      href: `/${locale}/settings/security`,
      label: t("items.security"),
      desc: t("items.securityDesc"),
    },
    {
      href: `/${locale}/settings/blocked`,
      label: t("items.blocked"),
      desc: t("items.blockedDesc"),
    },
    {
      href: `/${locale}/me/karama`,
      label: tMe("karama"),
      desc: t("notifications.events.karamaUpdate.desc"),
    },
    {
      href: `/${locale}/me/premium`,
      label: t("items.premium"),
      desc: t("items.premiumDesc"),
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("subtitle")}</p>
      </header>
      <Surface variant="flat" padding="0">
        <ul>
          {items.map((item, i) => (
            <li key={item.href} className={i > 0 ? "border-line-soft border-t" : ""}>
              <Link
                href={item.href}
                className="hover:bg-surface-subtle focus-visible:outline-hidden group flex items-start justify-between gap-4 px-4 py-4 transition-colors focus-visible:[box-shadow:var(--focus-ring)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-ink text-sm font-semibold">{item.label}</div>
                  <div className="text-ink-muted mt-0.5 text-sm">{item.desc}</div>
                </div>
                <span
                  aria-hidden="true"
                  className="rtl-mirror text-ink-subtle group-hover:text-ink-muted mt-0.5 text-base"
                >
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Surface>
    </main>
  );
}
