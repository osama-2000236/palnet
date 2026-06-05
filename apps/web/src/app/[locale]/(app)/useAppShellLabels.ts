"use client";

import type { AppShellLabels } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

export function useAppShellLabels(): AppShellLabels {
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const tFeed = useTranslations("feed");
  const tNetwork = useTranslations("network");
  const tSearch = useTranslations("search");
  const tMsg = useTranslations("messaging");
  const tNotif = useTranslations("notifications");
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
      tSearch,
      tBell,
      tProfile,
      tAuth,
      tEmployer,
      tSaved,
    ],
  );
}
