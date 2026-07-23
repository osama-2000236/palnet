"use client";

import { AppShell, type AppShellLabels } from "@baydar/ui-web";
import { Illustration, Surface } from "@baydar/ui-web";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import type { Locale } from "@/i18n";

export default function LocaleNotFound(): JSX.Element {
  const params = useParams<{ locale: Locale }>();
  const locale = params.locale;

  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const tFeed = useTranslations("feed");
  const tNetwork = useTranslations("network");
  const tMsg = useTranslations("messaging");
  const tNotif = useTranslations("notifications");
  const tActivity = useTranslations("activity");
  const tBell = useTranslations("chrome.bell");
  const tProfile = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tSaved = useTranslations("saved");
  const tEmployer = useTranslations("employer");
  const tNotFound = useTranslations("errors.notFound");

  const labels: AppShellLabels = {
    logoAlt: tCommon("appName"),
    searchPlaceholder: tNav("searchPlaceholder"),
    searchLabel: tMsg("title"),
    mainNavLabel: tNav("main"),
    nav: {
      feed: tFeed("title"),
      network: tNetwork("title"),
      jobs: tNav("jobs"),
      messages: tMsg("title"),
      notifications: tNotif("title"),
      activity: tActivity("title"),
      saved: tSaved("title"),
      employer: tEmployer("title"),
    },
    myProfile: tNav("myProfile"),
    viewProfile: tProfile("viewPublic"),
    settings: tNav("settings"),
    signOut: tAuth("logout"),
    unreadTemplate: {
      messages: tNav("unreadMessages", { count: "{count}" }),
      notifications: tNav("unreadNotifications", { count: "{count}" }),
      activity: "",
      saved: "",
      employer: "",
    },
    bellDisconnected: tBell("disconnected"),
  };

  return (
    <AppShell
      bare={false}
      currentRoute={null}
      me={null}
      meHeadline={null}
      labels={labels}
      messagesUnread={0}
      notificationsUnread={0}
      notificationsConnectionDropped={false}
      searchValue={""}
      onSearchChange={() => {}}
      onSearchSubmit={() => {}}
      onNavigate={() => {}}
      onViewProfile={() => {}}
      onOpenSettings={() => {}}
      onSignOut={() => {}}
    >
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-6 py-12">
        <Surface
          variant="tinted"
          padding="8"
          className="flex flex-col items-center gap-4 text-center"
        >
          {/* `block` is the failure register — see DESIGN.md §7.5. */}
          <Illustration motif="error" direction="block" size="lg" />
          <h1 className="text-ink text-xl font-semibold">{tNotFound("title")}</h1>
          <p className="text-ink-muted text-sm">{tNotFound("body")}</p>
          <div className="flex gap-3">
            <Link
              href={`/${locale}/search`}
              className="bg-surface-muted border-line-hard hover:bg-surface-subtle flex-1 rounded-md px-4 py-2 text-center text-sm font-medium"
            >
              {tCommon("search")}
            </Link>
            <Link
              href={`/${locale}`}
              className="bg-brand-600 text-ink-inverse hover:bg-brand-700 flex-1 rounded-md px-4 py-2 text-center text-sm font-medium"
            >
              {tCommon("home")}
            </Link>
          </div>
        </Surface>
      </main>
    </AppShell>
  );
}
