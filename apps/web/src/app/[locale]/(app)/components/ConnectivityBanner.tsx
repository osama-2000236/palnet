"use client";

import { Banner } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useOnline } from "@/lib/useOnline";

export function ConnectivityBanner({
  degraded = false,
}: {
  degraded?: boolean;
}): JSX.Element | null {
  const t = useTranslations("chrome.connectivity");
  const state = useOnline();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (state === "offline") {
    return (
      <div data-testid="connectivity-banner">
        <Banner kind="warning" live="assertive">
          {t("offline")}
        </Banner>
      </div>
    );
  }

  if (state === "restored") {
    return (
      <div data-testid="connectivity-banner">
        <Banner kind="success" live="polite" dismissible={false}>
          {t("restored")}
        </Banner>
      </div>
    );
  }

  if (degraded) {
    return (
      <div data-testid="connectivity-banner">
        <Banner kind="info" live="polite">
          {t("degraded")}
        </Banner>
      </div>
    );
  }

  return null;
}
