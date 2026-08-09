import { profileCompletion, Profile as ProfileSchema, type Profile } from "@baydar/shared";
import { Alert, Avatar, Button, Surface, Tab, Tabs } from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FieldCover } from "@/components/FieldCover";
import { ProfileScreenSkeleton } from "@/components/ScreenSkeleton";
import { apiFetch, signOut } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken } from "@/lib/session";

import { Section } from "@/screens/me/Section";
import { ProfileQuickLinks } from "@/screens/me/ProfileQuickLinks";
import { useCvExport } from "@/screens/me/useCvExport";
import { useStyles } from "@/screens/me/styles";

type ProfileTab = "about" | "exp" | "edu" | "skills";

const TABS: { key: ProfileTab; i18n: string }[] = [
  { key: "about", i18n: "profile.about" },
  { key: "exp", i18n: "profile.experience" },
  { key: "edu", i18n: "profile.education" },
  { key: "skills", i18n: "profile.skills" },
];

export default function MeScreen(): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();
  const cv = useCvExport();
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

  // On focus, not just mount — otherwise editing the profile and coming back
  // leaves the identity block and the completion rail showing stale values.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const logout = useCallback(async (): Promise<void> => {
    setLoggingOut(true);
    await signOut();
    router.replace("/(auth)/login");
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <ProfileScreenSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.errorScreen}>
        <Alert
          body={error ?? t("profile.notFound")}
          cta={t("common.retry")}
          onAction={() => void load()}
        />
      </SafeAreaView>
    );
  }

  const { completed, total, next } = profileCompletion(profile);
  const nextLabel = next ? t(`profile.completion.next.${next}`) : t("profile.completion.complete");

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Surface variant="hero" padding="0" style={styles.hero}>
          <FieldCover uri={profile.coverUrl} />
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
            {/* Closes HANDOFF gap #6. Web has had a CV export since it shipped
                and used the browser's print dialog as the exporter; a phone has
                no print dialog, so the server assembles the document and this
                hands it to the OS share sheet. */}
            <Button
              variant="ghost"
              size="md"
              loading={cv.exporting}
              accessibilityLabel={t("cv.export")}
              onPress={() => cv.run(profile.handle)}
            >
              {t("cv.export")}
            </Button>
          </View>
        </Surface>

        <ProfileQuickLinks />

        {/* The rail used to be a dead metric — it told you 4 of 5 and offered
            no way to fix the fifth. It now names the missing step and is the
            button that takes you there. */}
        <Pressable
          onPress={() => router.push("/(app)/me/edit")}
          disabled={next === null}
          accessibilityRole="button"
          accessibilityLabel={`${t("feed.profileCompletion", { completed, total })} — ${nextLabel}`}
          testID="profile-completion-rail"
          style={({ pressed }) => (pressed && next ? styles.pressed : null)}
        >
          <Surface variant="tinted" padding="4" style={styles.progressRail}>
            <Text selectable style={styles.progressTitle}>
              {t("feed.profileCompletion", { completed, total })}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(completed / total) * 100}%` }]} />
            </View>
            <Text selectable style={styles.progressNext}>
              {nextLabel}
            </Text>
          </Surface>
        </Pressable>

        <Tabs
          value={activeTab}
          onChange={(key) => setActiveTab(key as ProfileTab)}
          testID="profile-section-tabs"
        >
          {TABS.map((tab) => (
            <Tab key={tab.key} value={tab.key}>
              {t(tab.i18n)}
            </Tab>
          ))}
        </Tabs>

        {activeTab === "about" ? (
          profile.about ? (
            <Section title={t("profile.about")}>
              <Text selectable style={styles.bodyText}>
                {profile.about}
              </Text>
            </Section>
          ) : (
            <Alert body={t("profile.aboutEmpty")} />
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
