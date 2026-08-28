"use client";

import { Profile as ProfileSchema, type Profile } from "@baydar/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Alert, Skeleton } from "@baydar/ui-web";

import { apiFetch } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { getAccessToken } from "@/lib/session";
import { BasicsSection } from "./_components/EditProfileBasics";
import { EducationsSection, SkillsSection } from "./_components/EditProfileEducationSkills";
import { ExperiencesSection } from "./_components/EditProfileExperiences";

export default function EditProfilePage(): JSX.Element {
  const router = useRouter();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(null);
    // Without this catch the rejection went nowhere: `profile` stayed null, and
    // the branch below rendered a single "…" as the entire page — no message, no
    // way back. `/me` falls back here when it cannot resolve a handle, so a
    // profile-load failure funnelled the reader straight into that dead end.
    try {
      const p = await apiFetch("/profiles/me", ProfileSchema, { token });
      setProfile(p);
    } catch (caught) {
      setError(toErrorMessage(caught, tErrors));
    }
  };

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading and failure are different things and used to render identically.
  // Same split the mobile twin already makes (`app/(app)/me/edit.tsx`).
  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-[840px] flex-col gap-4 px-6 py-8">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-[840px] px-6 py-8">
        <Alert
          kind="danger"
          body={error ?? tCommon("genericError")}
          cta={tCommon("retry")}
          onAction={() => {
            setLoading(true);
            void refresh().finally(() => setLoading(false));
          }}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-ink text-3xl font-bold">{t("editTitle")}</h1>
        <Link
          href={`/in/${profile.handle}`}
          className="target-area text-ink-muted focus-visible:outline-hidden inline-flex items-center text-sm hover:underline focus-visible:[box-shadow:var(--focus-ring)]"
        >
          {t("viewPublic")}
        </Link>
      </header>

      <BasicsSection profile={profile} onChanged={setProfile} />
      <ExperiencesSection profile={profile} onChanged={setProfile} />
      <EducationsSection profile={profile} onChanged={setProfile} />
      <SkillsSection profile={profile} onChanged={setProfile} />
    </main>
  );
}
