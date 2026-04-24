"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@palnet/ui-web";
import { useTranslations } from "next-intl";
import { type ReactNode } from "react";

// Settings shell — sidebar nav + outlet. Keeps each /settings/* page focused
// on its own form.
export default function SettingsLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const t = useTranslations("settings");
  const pathname = usePathname() ?? "";

  const items: Array<{
    href: string;
    key: "account" | "sessions" | "notifications" | "blocks";
  }> = [
    { href: "/settings/account", key: "account" },
    { href: "/settings/sessions", key: "sessions" },
    { href: "/settings/notifications", key: "notifications" },
    { href: "/settings/blocks", key: "blocks" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[960px] gap-6 px-6 py-8">
      <nav
        aria-label={t("navLabel")}
        className="w-52 shrink-0 flex-col gap-1 hidden md:flex"
      >
        <h1 className="mb-2 text-lg font-bold text-ink">{t("title")}</h1>
        {items.map((item) => {
          const active = pathname.includes(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-brand-100 font-semibold text-brand-700"
                  : "text-ink hover:bg-surface-subtle",
              )}
            >
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </main>
  );
}
