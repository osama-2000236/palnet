"use client";

import { Button, Surface } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  clearOnboardingHandoff,
  readOnboardingHandoff,
  type OnboardingHandoff,
} from "@/lib/session";

const DISMISSED_KEY = "baydar.onboarding.dismissed";
const HANDOFF_MAX_AGE_MS = 1000 * 60 * 60 * 24;

export interface OnboardingDoneCardProps {
  forceVisible: boolean;
  onDismiss?: () => void;
}

export function OnboardingDoneCard({
  forceVisible,
  onDismiss,
}: OnboardingDoneCardProps): JSX.Element | null {
  const t = useTranslations("feed");
  const tCommon = useTranslations("common");
  const [handoff, setHandoff] = useState<OnboardingHandoff | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISSED_KEY)) return;

    const next = readOnboardingHandoff();
    const fresh = next?.createdAt && Date.now() - Date.parse(next.createdAt) <= HANDOFF_MAX_AGE_MS;
    if (!forceVisible && !fresh) return;

    setHandoff(next);
    setVisible(true);
  }, [forceVisible]);

  if (!visible) return null;

  function dismiss(): void {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
    }
    clearOnboardingHandoff();
    setVisible(false);
    onDismiss?.();
  }

  return (
    <Surface variant="hero" padding="4" className="mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-ink text-base font-semibold">
            {t("onboardingDoneTitle", { name: handoff?.name || t("title") })}
          </h2>
          <p className="text-ink-muted mt-1 text-sm">{t("onboardingDoneBody")}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={dismiss}>
          {tCommon("continue")}
        </Button>
      </div>
    </Surface>
  );
}
