"use client";

import { EndorseSkillResult, type Profile } from "@baydar/shared";
import { Button, Surface, Tab, Tabs } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { apiFetch, getValidAccessToken } from "@/lib/api";

export type ProfileTab = "about" | "exp" | "edu" | "skills" | "activity";

export function ProfileTabsContent({
  profile,
  tab,
  onTabChange,
}: {
  profile: Profile;
  tab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}): JSX.Element {
  const t = useTranslations("profile");

  return (
    <>
      <Surface variant="flat" padding="0" className="px-5">
        <Tabs
          value={tab}
          onChange={(next) => onTabChange(next as ProfileTab)}
          label={t("sectionsLabel")}
        >
          <Tab value="about">{t("about")}</Tab>
          <Tab value="exp" count={profile.experiences.length}>
            {t("experience")}
          </Tab>
          <Tab value="edu" count={profile.educations.length}>
            {t("education")}
          </Tab>
          <Tab value="skills" count={profile.skills.length}>
            {t("skills")}
          </Tab>
          <Tab value="activity">{t("posts")}</Tab>
        </Tabs>
      </Surface>

      {tab === "about" ? <AboutPanel profile={profile} /> : null}
      {tab === "exp" ? <ExperiencePanel profile={profile} /> : null}
      {tab === "edu" ? <EducationPanel profile={profile} /> : null}
      {tab === "skills" ? <SkillsPanel profile={profile} /> : null}
      {tab === "activity" ? <ActivityPanel /> : null}
    </>
  );
}

function AboutPanel({ profile }: { profile: Profile }): JSX.Element {
  const t = useTranslations("profile");
  return profile.about ? (
    <Surface as="section" variant="flat" padding="6">
      <h2 className="text-ink mb-2 text-xl font-semibold">{t("about")}</h2>
      <p className="text-ink whitespace-pre-wrap">{profile.about}</p>
    </Surface>
  ) : (
    <Surface variant="tinted" padding="6">
      <p className="text-ink-muted text-center text-sm">{t("aboutEmpty")}</p>
    </Surface>
  );
}

function ExperiencePanel({ profile }: { profile: Profile }): JSX.Element {
  const t = useTranslations("profile");
  return (
    <Surface as="section" variant="card" padding="0">
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="text-ink text-xl font-semibold">{t("experience")}</h2>
      </div>
      {profile.experiences.length === 0 ? (
        <p className="text-ink-muted px-5 pb-4 text-sm">{t("expEmpty")}</p>
      ) : (
        <ul className="flex flex-col">
          {profile.experiences.map((e, i) => (
            <li key={e.id ?? i} className="border-line-soft flex gap-4 border-t px-5 py-4">
              <div className="bg-surface-sunken text-ink-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                {(e.companyName[0] ?? "?").toUpperCase()}
              </div>
              <div>
                <p className="text-ink font-semibold">{e.title}</p>
                <p className="text-ink-muted text-sm">{e.companyName}</p>
                {e.description ? <p className="text-ink mt-1 text-sm">{e.description}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

function EducationPanel({ profile }: { profile: Profile }): JSX.Element {
  const t = useTranslations("profile");
  return (
    <Surface as="section" variant="flat" padding="6">
      <h2 className="text-ink mb-3 text-xl font-semibold">{t("education")}</h2>
      {profile.educations.length === 0 ? (
        <p className="text-ink-muted text-sm">{t("eduEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {profile.educations.map((e, i) => (
            <li key={e.id ?? i}>
              <p className="text-ink font-semibold">{e.school}</p>
              {e.degree ? (
                <p className="text-ink-muted text-sm">
                  {e.degree}
                  {e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

function SkillsPanel({ profile }: { profile: Profile }): JSX.Element {
  const t = useTranslations("profile");
  const [endorsementCounts, setEndorsementCounts] = useState<Record<string, number>>({});
  const [endorsedSkillIds, setEndorsedSkillIds] = useState<Set<string>>(() => new Set());
  const [busySkillId, setBusySkillId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setEndorsementCounts(
      Object.fromEntries(profile.skills.map((skill) => [skill.id, skill.endorsements])),
    );
    setEndorsedSkillIds(new Set());
  }, [profile.skills]);

  async function endorseSkill(skillId: string): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) {
      setNotice(t("endorseSignIn"));
      return;
    }
    setBusySkillId(skillId);
    setNotice(null);
    try {
      const result = await apiFetch(
        `/profiles/${profile.handle}/skills/${skillId}/endorse`,
        EndorseSkillResult,
        { method: "POST", token },
      );
      setEndorsementCounts((current) => ({ ...current, [skillId]: result.endorsements }));
      setEndorsedSkillIds((current) => {
        const next = new Set(current);
        next.add(skillId);
        return next;
      });
      setNotice(result.awardedKarama ? t("endorseSuccess") : t("endorseAlready"));
    } catch {
      setNotice(t("endorseFailed"));
    } finally {
      setBusySkillId(null);
    }
  }

  const canEndorse =
    profile.viewer !== undefined &&
    !profile.viewer.isSelf &&
    profile.viewer.connection?.status !== "BLOCKED";

  return (
    <Surface as="section" variant="flat" padding="6">
      <h2 className="text-ink mb-3 text-xl font-semibold">{t("skills")}</h2>
      {profile.skills.length === 0 ? (
        <p className="text-ink-muted text-sm">{t("skillsEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {profile.skills.map((s) => (
            <li
              key={s.id}
              className="border-line-soft flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-ink font-semibold">{s.name}</span>
                <span className="text-ink-muted text-xs">
                  <span dir="ltr">{endorsementCounts[s.id] ?? s.endorsements}</span>{" "}
                  {t("endorsementsLabel")}
                </span>
              </span>
              {canEndorse ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={busySkillId === s.id}
                  disabled={busySkillId !== null || endorsedSkillIds.has(s.id)}
                  onClick={() => void endorseSkill(s.id)}
                  aria-label={t("endorseSkill", { skill: s.name })}
                >
                  {endorsedSkillIds.has(s.id) ? t("endorsed") : t("endorse")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {notice ? <p className="text-ink-muted mt-3 text-sm">{notice}</p> : null}
    </Surface>
  );
}

function ActivityPanel(): JSX.Element {
  const t = useTranslations("profile");
  return (
    <Surface as="section" variant="flat" padding="6">
      <h2 className="text-ink mb-4 text-xl font-semibold">{t("posts")}</h2>
      <p className="text-ink-muted text-sm">{t("postsEmpty")}</p>
    </Surface>
  );
}
