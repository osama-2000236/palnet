import { isProfileComplete, Profile as ProfileSchema, type Profile } from "@baydar/shared";
import { Alert, AppHeader, Button, useToast } from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CardStackSkeleton } from "@/components/ScreenSkeleton";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { clearProfileCache, getAccessToken, writeProfileCache } from "@/lib/session";
import { BasicsCard } from "@/screens/edit-profile/BasicsCard";
import { EducationsCard } from "@/screens/edit-profile/EducationsCard";
import { ExperiencesCard } from "@/screens/edit-profile/ExperiencesCard";
import { SkillsCard } from "@/screens/edit-profile/SkillsCard";
import { useStyles } from "@/screens/edit-profile/styles";

export default function EditProfileScreen(): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
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
    }
  }, [t]);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Every card (basics, experience, education, skills) reports through here, so
  // one toast covers them all — a PATCH that returns 200 with no visible change
  // otherwise reads as a no-op.
  const handleProfileChanged = useCallback(
    async (next: Profile): Promise<void> => {
      setProfile(next);
      if (isProfileComplete(next)) {
        await writeProfileCache(next);
        showToast({ message: t("profile.savedToast"), kind: "success" });
        return;
      }
      await clearProfileCache();
      router.replace("/(app)/onboarding");
    },
    [showToast, t],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <CardStackSkeleton />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        {error ? (
          <View style={styles.errorWrap}>
            <Alert
              body={error}
              cta={t("common.retry")}
              onAction={() => {
                setLoading(true);
                void refresh().finally(() => setLoading(false));
              }}
            />
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <AppHeader
            title={t("profile.editTitle")}
            compact
            trailing={
              <Button variant="ghost" size="sm" onPress={() => router.back()}>
                {t("common.cancel")}
              </Button>
            }
          />
          {error ? (
            <Alert body={error} cta={t("common.retry")} onAction={() => void refresh()} />
          ) : null}
          <BasicsCard
            profile={profile}
            onChanged={(next) => void handleProfileChanged(next)}
            onError={setError}
          />
          <ExperiencesCard
            profile={profile}
            onChanged={(next) => void handleProfileChanged(next)}
            onError={setError}
          />
          <EducationsCard
            profile={profile}
            onChanged={(next) => void handleProfileChanged(next)}
            onError={setError}
          />
          <SkillsCard
            profile={profile}
            onChanged={(next) => void handleProfileChanged(next)}
            onError={setError}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
