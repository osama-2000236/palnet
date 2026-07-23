"use client";

import { formatNumber } from "@baydar/shared";
import type { AppShellLabels } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

export function useAppShellLabels(): AppShellLabels {
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const tFeed = useTranslations("feed");
  const tNetwork = useTranslations("network");
  const tSearch = useTranslations("search");
  const tMsg = useTranslations("messaging");
  const tNotif = useTranslations("notifications");
  const tActivity = useTranslations("activity");
  const tBell = useTranslations("chrome.bell");
  const tProfile = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const tSaved = useTranslations("saved");
  const tEmployer = useTranslations("employer");

  return useMemo(
    () => ({
      logoAlt: tCommon("appName"),
      searchPlaceholder: tNav("searchPlaceholder"),
      searchLabel: tSearch("title"),
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
    }),
    [
      tCommon,
      tNav,
      tFeed,
      tNetwork,
      tMsg,
      tNotif,
      tActivity,
      tSearch,
      tBell,
      tProfile,
      tAuth,
      tEmployer,
      tSaved,
    ],
  );
}

/**
 * Unread badges are numbers the kit renders; the app owns the digit script
 * (packages/shared/src/format.ts), so it hands the formatter down.
 */
export function useCountFormatter(): (value: number) => string {
  const locale = useLocale();
  return useCallback((value: number) => formatNumber(value, locale), [locale]);
}
