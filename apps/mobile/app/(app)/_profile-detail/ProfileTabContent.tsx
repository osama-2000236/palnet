import { EndorseSkillResult, type Profile } from "@baydar/shared";
import { Button, Surface } from "@baydar/ui-native";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

import { profileStyles } from "./styles";

export type ProfileTab = "about" | "exp" | "edu" | "skills";

export const PROFILE_TABS: { key: ProfileTab; i18n: string }[] = [
  { key: "about", i18n: "profile.about" },
  { key: "exp", i18n: "profile.experience" },
  { key: "edu", i18n: "profile.education" },
  { key: "skills", i18n: "profile.skills" },
];

export function ProfileTabContent({
  activeTab,
  profile,
}: {
  activeTab: ProfileTab;
  profile: Profile;
}): JSX.Element {
  const { t } = useTranslation();
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
    setBusySkillId(skillId);
    setNotice(null);
    try {
      const result = await apiFetch(
        `/profiles/${profile.handle}/skills/${skillId}/endorse`,
        EndorseSkillResult,
        { method: "POST" },
      );
      setEndorsementCounts((current) => ({ ...current, [skillId]: result.endorsements }));
      setEndorsedSkillIds((current) => {
        const next = new Set(current);
        next.add(skillId);
        return next;
      });
      setNotice(result.awardedKarama ? t("profile.endorseSuccess") : t("profile.endorseAlready"));
    } catch (caught) {
      setNotice(apiErrorMessage(t, caught));
    } finally {
      setBusySkillId(null);
    }
  }

  const canEndorse =
    profile.viewer !== undefined &&
    !profile.viewer.isSelf &&
    profile.viewer.connection?.status !== "BLOCKED";

  if (activeTab === "about") {
    return profile.about ? (
      <Section title={t("profile.about")}>
        <Text style={profileStyles.bodyText}>{profile.about}</Text>
      </Section>
    ) : (
      <Surface variant="tinted" padding="6">
        <Text style={profileStyles.emptyText}>{t("profile.aboutEmpty")}</Text>
      </Surface>
    );
  }

  if (activeTab === "exp") {
    return (
      <Section title={t("profile.experience")}>
        {profile.experiences.length === 0 ? (
          <Text style={profileStyles.emptyText}>{t("profile.expEmpty")}</Text>
        ) : (
          profile.experiences.map((item, index) => (
            <View
              key={item.id ?? `${item.companyName}-${item.startDate}`}
              style={index === 0 ? undefined : profileStyles.experienceItemSpacing}
            >
              <Text style={profileStyles.itemTitle}>{item.title}</Text>
              <Text style={profileStyles.itemSubtitle}>{item.companyName}</Text>
              {item.description ? (
                <Text style={profileStyles.itemDescription}>{item.description}</Text>
              ) : null}
            </View>
          ))
        )}
      </Section>
    );
  }

  if (activeTab === "edu") {
    return (
      <Section title={t("profile.education")}>
        {profile.educations.length === 0 ? (
          <Text style={profileStyles.emptyText}>{t("profile.eduEmpty")}</Text>
        ) : (
          profile.educations.map((item, index) => (
            <View
              key={item.id ?? item.school}
              style={index === 0 ? undefined : profileStyles.experienceItemSpacing}
            >
              <Text style={profileStyles.itemTitle}>{item.school}</Text>
              {item.degree ? (
                <Text style={profileStyles.itemSubtitle}>
                  {item.degree}
                  {item.fieldOfStudy ? ` · ${item.fieldOfStudy}` : ""}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </Section>
    );
  }

  return (
    <Section title={t("profile.skills")}>
      {profile.skills.length === 0 ? (
        <Text style={profileStyles.emptyText}>{t("profile.skillsEmpty")}</Text>
      ) : (
        <View style={profileStyles.skillsList}>
          {profile.skills.map((skill) => (
            <View key={skill.id} style={profileStyles.skillItem}>
              <View style={profileStyles.skillCopy}>
                <Text style={profileStyles.skillLabel}>{skill.name}</Text>
                <Text style={profileStyles.skillMeta}>
                  <Text style={profileStyles.skillCount}>
                    {endorsementCounts[skill.id] ?? skill.endorsements}
                  </Text>{" "}
                  {t("profile.endorsementsLabel")}
                </Text>
              </View>
              {canEndorse ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={busySkillId === skill.id}
                  disabled={busySkillId !== null || endorsedSkillIds.has(skill.id)}
                  onPress={() => void endorseSkill(skill.id)}
                  accessibilityLabel={t("profile.endorseSkill", { skill: skill.name })}
                >
                  {endorsedSkillIds.has(skill.id) ? t("profile.endorsed") : t("profile.endorse")}
                </Button>
              ) : null}
            </View>
          ))}
        </View>
      )}
      {notice ? <Text style={profileStyles.skillNotice}>{notice}</Text> : null}
    </Section>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }): JSX.Element {
  return (
    <Surface variant="card" padding="4">
      <Text style={profileStyles.sectionTitle}>{title}</Text>
      {children}
    </Surface>
  );
}
