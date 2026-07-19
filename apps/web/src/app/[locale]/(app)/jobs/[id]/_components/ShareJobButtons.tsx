"use client";

// Share affordances for a job. WhatsApp is the primary distribution channel
// for our users, so it gets its own button; the second button uses the native
// Web Share sheet when the browser has one (mobile) and falls back to
// clipboard copy (desktop). Links point at the PUBLIC share page (/j/:id) so
// recipients without an account see the role instead of a login wall.

import { Button, Icon, useToast } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";

export function ShareJobButtons({ jobId, title }: { jobId: string; title: string }): JSX.Element {
  const t = useTranslations("jobs.share");
  const locale = useLocale();
  const { showToast } = useToast();

  const publicUrl = useCallback(
    () => `${window.location.origin}/${locale}/j/${jobId}`,
    [locale, jobId],
  );

  const shareWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`${title}\n${publicUrl()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }, [title, publicUrl]);

  const shareOrCopy = useCallback(async () => {
    const url = publicUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User dismissed the sheet — not an error.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    showToast({ kind: "success", message: t("copied") });
  }, [title, publicUrl, showToast, t]);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={shareWhatsApp}
        leading={<Icon name="share" size={16} />}
      >
        {t("whatsapp")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => void shareOrCopy()}>
        {t("copy")}
      </Button>
    </div>
  );
}
