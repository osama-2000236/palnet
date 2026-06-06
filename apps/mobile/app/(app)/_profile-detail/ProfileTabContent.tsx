import type { Profile } from "@baydar/shared";
import { Surface } from "@baydar/ui-native";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

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

  return (
    <Section title={t("profile.skills")}>
      {profile.skills.length === 0 ? (
        <Text style={profileStyles.emptyText}>{t("profile.skillsEmpty")}</Text>
      ) : (
        <View style={profileStyles.skillsRow}>
          {profile.skills.map((skill) => (
            <View key={skill.id} style={profileStyles.skillChip}>
              <Text style={profileStyles.skillLabel}>{skill.name}</Text>
            </View>
          ))}
        </View>
      )}
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
