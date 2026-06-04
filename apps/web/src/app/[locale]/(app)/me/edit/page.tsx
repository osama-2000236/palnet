"use client";

import { Profile as ProfileSchema, type Profile } from "@baydar/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { BasicsSection } from "./_components/EditProfileBasics";
import {
  EducationsSection,
  SkillsSection,
} from "./_components/EditProfileEducationSkills";
import { ExperiencesSection } from "./_components/EditProfileExperiences";

export default function EditProfilePage(): JSX.Element {
  const router = useRouter();
  const t = useTranslations("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (): Promise<void> => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const p = await apiFetch("/profiles/me", ProfileSchema, { token });
    setProfile(p);
  };

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !profile) {
    return <main className="text-ink-muted mx-auto max-w-[840px] px-6 py-10">…</main>;
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-ink text-3xl font-bold">{t("editTitle")}</h1>
        <Link
          href={`/in/${profile.handle}`}
          className="text-ink-muted text-sm hover:underline focus-visible:[box-shadow:var(--focus-ring)] focus-visible:outline-none"
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
