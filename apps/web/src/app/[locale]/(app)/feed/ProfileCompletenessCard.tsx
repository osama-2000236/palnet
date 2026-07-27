"use client";

// New-user home: profile completeness card (web twin of the mobile
// ProfileSummary progress row in _feed/FeedParts.tsx). Same 5-item
// checklist; hides itself once the profile is complete.

import { profileCompletion, type Profile } from "@baydar/shared";
import { Button, Surface } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export function ProfileCompletenessCard({ profile }: { profile: Profile }): JSX.Element | null {
  const t = useTranslations("feed");
  const router = useRouter();
  const locale = useLocale();

  const { completed, total } = profileCompletion(profile);
  if (completed >= total) return null;

  return (
    <Surface variant="tinted" padding="4" className="mb-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-ink text-sm font-semibold">
          {t("profileCompletion", { completed, total })}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push(`/${locale}/me/edit`)}
          aria-label={t("editProfile")}
        >
          {t("editProfile")}
        </Button>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-label={t("profileCompletion", { completed, total })}
        className="bg-line-soft h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-brand-500 h-full rounded-full"
          style={{ inlineSize: `${(completed / total) * 100}%` }}
        />
      </div>
    </Surface>
  );
}
