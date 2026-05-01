import { Profile as ProfileSchema, type Profile } from "@baydar/shared";
import { Avatar, Button, SegmentedControl, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { clearSession, getAccessToken } from "@/lib/session";

type ProfileTab = "about" | "exp" | "edu" | "skills";

const TABS: { key: ProfileTab; i18n: string }[] = [
  { key: "about", i18n: "profile.about" },
  { key: "exp", i18n: "profile.experience" },
  { key: "edu", i18n: "profile.education" },
  { key: "skills", i18n: "profile.skills" },
];

export default function MeScreen(): JSX.Element {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }
    setError(null);
    try {
      const next = await apiFetch("/profiles/me", ProfileSchema, { token });
      setProfile(next);
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = useCallback(async (): Promise<void> => {
    setLoggingOut(true);
    await clearSession();
    router.replace("/(auth)/login");
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <StateMessage message={t("common.loading")} role="text" />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.errorScreen}>
        <StateMessage
          message={error ?? t("profile.notFound")}
          actionLabel={t("common.retry")}
          onAction={() => void load()}
        />
      </SafeAreaView>
    );
  }

  const completed = [
    Boolean(profile.avatarUrl),
    Boolean(profile.headline),
    Boolean(profile.location),
    profile.experiences.length > 0 || profile.educations.length > 0,
    profile.skills.length > 0,
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Surface variant="hero" padding="0" style={styles.hero}>
          <View style={styles.coverBand} />
          <View style={styles.identityBlock}>
            <Avatar
              ring
              user={{
                id: profile.userId,
                handle: profile.handle,
                firstName: profile.firstName,
                lastName: profile.lastName,
                avatarUrl: profile.avatarUrl,
              }}
              size="xl"
            />
            <Text selectable style={styles.name}>
              {profile.firstName} {profile.lastName}
            </Text>
            {profile.headline ? (
              <Text selectable style={styles.headline}>
                {profile.headline}
              </Text>
            ) : null}
            {profile.location ? (
              <Text selectable style={styles.location}>
                {profile.location}
              </Text>
            ) : null}
            <Text selectable style={styles.handle}>
              /in/{profile.handle}
            </Text>
          </View>

          <View style={styles.heroActions}>
            <Button
              variant="primary"
              size="md"
              testID="profile-edit-button"
              onPress={() => router.push("/(app)/me/edit")}
              accessibilityLabel={t("profile.edit")}
            >
              {t("profile.edit")}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onPress={() => router.push(`/(app)/in/${profile.handle}`)}
            >
              {t("profile.publicView")}
            </Button>
          </View>
        </Surface>

        <Surface variant="tinted" padding="4" style={styles.progressRail}>
          <Text selectable style={styles.progressTitle}>
            {t("feed.profileCompletion", { completed, total: 5 })}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completed / 5) * 100}%` }]} />
          </View>
        </Surface>

        <SegmentedControl
          items={TABS.map((tab) => ({ key: tab.key, label: t(tab.i18n) }))}
          selectedKey={activeTab}
          onChange={setActiveTab}
          testID="profile-section-tabs"
        />

        {activeTab === "about" ? (
          profile.about ? (
            <Section title={t("profile.about")}>
              <Text selectable style={styles.bodyText}>
                {profile.about}
              </Text>
            </Section>
          ) : (
            <StateMessage message={t("profile.aboutEmpty")} role="text" />
          )
        ) : null}

        {activeTab === "exp" ? (
          <Section title={t("profile.experience")}>
            {profile.experiences.length === 0 ? (
              <Text selectable style={styles.emptyText}>
                {t("profile.expEmpty")}
              </Text>
            ) : (
              profile.experiences.map((item) => (
                <View key={item.id ?? `${item.companyName}-${item.startDate}`} style={styles.item}>
                  <Text selectable style={styles.itemTitle}>
                    {item.title}
                  </Text>
                  <Text selectable style={styles.itemMeta}>
                    {item.companyName}
                  </Text>
                  {item.description ? (
                    <Text selectable style={styles.itemBody}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </Section>
        ) : null}

        {activeTab === "edu" ? (
          <Section title={t("profile.education")}>
            {profile.educations.length === 0 ? (
              <Text selectable style={styles.emptyText}>
                {t("profile.eduEmpty")}
              </Text>
            ) : (
              profile.educations.map((item) => (
                <View key={item.id ?? item.school} style={styles.item}>
                  <Text selectable style={styles.itemTitle}>
                    {item.school}
                  </Text>
                  {item.degree ? (
                    <Text selectable style={styles.itemMeta}>
                      {item.degree}
                      {item.fieldOfStudy ? ` · ${item.fieldOfStudy}` : ""}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </Section>
        ) : null}

        {activeTab === "skills" ? (
          <Section title={t("profile.skills")}>
            {profile.skills.length === 0 ? (
              <Text selectable style={styles.emptyText}>
                {t("profile.skillsEmpty")}
              </Text>
            ) : (
              <View style={styles.skillsRow}>
                {profile.skills.map((skill) => (
                  <View key={skill.id} style={styles.skillChip}>
                    <Text selectable style={styles.skillLabel}>
                      {skill.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Section>
        ) : null}

        <Button
          variant="danger-ghost"
          size="md"
          fullWidth
          loading={loggingOut}
          disabled={loggingOut}
          onPress={() => void logout()}
          accessibilityLabel={t("auth.logout")}
        >
          {t("auth.logout")}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <Surface variant="card" padding="4" style={styles.section}>
      <Text selectable style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: nativeTokens.color.surfaceMuted,
    padding: nativeTokens.space[4],
  },
  errorScreen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
    padding: nativeTokens.space[4],
  },
  scrollBody: {
    padding: nativeTokens.space[4],
    gap: nativeTokens.space[4],
  },
  hero: {
    overflow: "hidden",
  },
  coverBand: {
    height: nativeTokens.space[16],
    backgroundColor: nativeTokens.color.brand100,
    borderBottomWidth: 1,
    borderBottomColor: nativeTokens.color.lineSoft,
  },
  identityBlock: {
    marginTop: -nativeTokens.space[8],
    paddingHorizontal: nativeTokens.space[4],
    paddingBottom: nativeTokens.space[3],
    alignItems: "flex-start",
  },
  name: {
    marginTop: nativeTokens.space[3],
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.display.size,
    lineHeight: nativeTokens.type.scale.display.line,
    fontWeight: "700",
    textAlign: "right",
  },
  headline: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    textAlign: "right",
  },
  location: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "right",
  },
  handle: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.mono,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    marginTop: nativeTokens.space[1],
    writingDirection: "ltr",
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
    paddingHorizontal: nativeTokens.space[4],
    paddingBottom: nativeTokens.space[4],
  },
  progressRail: {
    gap: nativeTokens.space[2],
  },
  progressTitle: {
    color: nativeTokens.color.brand700,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
    textAlign: "right",
  },
  progressTrack: {
    height: nativeTokens.space[2],
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.surfaceSunken,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.brand600,
  },
  section: {
    gap: nativeTokens.space[2],
  },
  sectionTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h2.size,
    lineHeight: nativeTokens.type.scale.h2.line,
    fontWeight: "700",
    textAlign: "right",
  },
  bodyText: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    textAlign: "right",
  },
  emptyText: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "right",
  },
  item: {
    gap: nativeTokens.space[1],
    paddingVertical: nativeTokens.space[2],
  },
  itemTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
    textAlign: "right",
  },
  itemMeta: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "right",
  },
  itemBody: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "right",
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
  },
  skillChip: {
    borderWidth: 1,
    borderColor: nativeTokens.color.lineHard,
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.surfaceSubtle,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[1],
  },
  skillLabel: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
});
