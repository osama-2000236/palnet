import { EndorseSkillResult, type Profile } from "@baydar/shared";
import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { apiFetch } from "@/lib/api";

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

  return <SkillsSection profile={profile} />;
}

function SkillsSection({ profile }: { profile: Profile }): JSX.Element {
  const { t } = useTranslation();
  // Session-local endorsement state; the endpoint is idempotent per endorser.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [endorsedIds, setEndorsedIds] = useState<Set<string>>(new Set());
  const [busySkillId, setBusySkillId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);

  const canEndorse = profile.viewer !== undefined && !profile.viewer.isSelf;

  async function endorse(skillId: string): Promise<void> {
    setBusySkillId(skillId);
    setFeedback(null);
    try {
      const result = await apiFetch(
        `/profiles/${encodeURIComponent(profile.handle)}/skills/${skillId}/endorse`,
        EndorseSkillResult,
        { method: "POST" },
      );
      setCounts((current) => ({ ...current, [skillId]: result.endorsements }));
      setEndorsedIds((current) => new Set(current).add(skillId));
      setFeedback({
        text: result.awardedKarama ? t("profile.endorseThanks") : t("profile.endorseAlready"),
        error: false,
      });
    } catch {
      setFeedback({ text: t("profile.endorseError"), error: true });
    } finally {
      setBusySkillId(null);
    }
  }

  return (
    <Section title={t("profile.skills")}>
      {profile.skills.length === 0 ? (
        <Text style={profileStyles.emptyText}>{t("profile.skillsEmpty")}</Text>
      ) : (
        <View style={endorseStyles.list}>
          {feedback ? (
            <Text style={[endorseStyles.feedback, feedback.error && endorseStyles.feedbackError]}>
              {feedback.text}
            </Text>
          ) : null}
          {profile.skills.map((skill) => {
            const count = counts[skill.id] ?? skill.endorsements;
            const endorsed = endorsedIds.has(skill.id);
            return (
              <View key={skill.id} style={endorseStyles.row}>
                <Text style={endorseStyles.name}>
                  {skill.name}
                  {count > 0 ? (
                    <Text
                      style={endorseStyles.count}
                      accessibilityLabel={t("profile.endorseCountLabel", { count })}
                    >
                      {"  "}
                      {count}
                    </Text>
                  ) : null}
                </Text>
                {canEndorse ? (
                  <Button
                    variant={endorsed ? "ghost" : "secondary"}
                    size="sm"
                    disabled={endorsed || busySkillId !== null}
                    loading={busySkillId === skill.id}
                    onPress={() => void endorse(skill.id)}
                    accessibilityLabel={endorsed ? t("profile.endorsed") : t("profile.endorse")}
                  >
                    {endorsed ? t("profile.endorsed") : t("profile.endorse")}
                  </Button>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Section>
  );
}

const endorseStyles = StyleSheet.create({
  list: {
    gap: nativeTokens.space[2],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: nativeTokens.space[3],
    borderWidth: 1,
    borderColor: nativeTokens.color.lineSoft,
    borderRadius: nativeTokens.radius.md,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[2],
  },
  name: {
    flexShrink: 1,
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "600",
  },
  count: {
    color: nativeTokens.color.inkMuted,
    fontWeight: "400",
  },
  feedback: {
    color: nativeTokens.color.brand700,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  feedbackError: {
    color: nativeTokens.color.danger,
  },
});

function Section({ children, title }: { children: ReactNode; title: string }): JSX.Element {
  return (
    <Surface variant="card" padding="4">
      <Text style={profileStyles.sectionTitle}>{title}</Text>
      {children}
    </Surface>
  );
}
