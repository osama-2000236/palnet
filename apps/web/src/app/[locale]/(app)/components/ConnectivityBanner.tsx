"use client";

import { Banner } from "@baydar/ui-web";
import { useTranslations } from "next-intl";

import { useOnline } from "@/lib/useOnline";

export function ConnectivityBanner({
  degraded = false,
}: {
  degraded?: boolean;
}): JSX.Element | null {
  const t = useTranslations("chrome.connectivity");
  const state = useOnline();

  if (state === "offline") {
    return (
      <Banner kind="warning" live="assertive">
        {t("offline")}
      </Banner>
    );
  }

  if (state === "restored") {
    return (
      <Banner kind="success" live="polite" dismissible={false}>
        {t("restored")}
      </Banner>
    );
  }

  if (degraded) {
    return (
      <Banner kind="info" live="polite">
        {t("degraded")}
      </Banner>
    );
  }

  return null;
}
