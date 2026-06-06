import { isProfileComplete, Profile as ProfileSchema, type Profile } from "@baydar/shared";
import { AppHeader, Button } from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { clearProfileCache, getAccessToken, writeProfileCache } from "@/lib/session";
import { BasicsCard } from "../_edit-profile/BasicsCard";
import { EducationsCard } from "../_edit-profile/EducationsCard";
import { ExperiencesCard } from "../_edit-profile/ExperiencesCard";
import { SkillsCard } from "../_edit-profile/SkillsCard";
import { styles } from "../_edit-profile/styles";

export default function EditProfileScreen(): JSX.Element {
  const { t } = useTranslation();
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

  const handleProfileChanged = useCallback(async (next: Profile): Promise<void> => {
    setProfile(next);
    if (isProfileComplete(next)) {
      await writeProfileCache(next);
      return;
    }
    await clearProfileCache();
    router.replace("/(app)/onboarding");
  }, []);

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        {loading ? (
          <StateMessage message={t("common.loading")} role="text" />
        ) : error ? (
          <View style={styles.errorWrap}>
            <StateMessage
              message={error}
              actionLabel={t("common.retry")}
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
          {error ? <StateMessage message={error} actionLabel={t("common.retry")} onAction={() => void refresh()} /> : null}
          <BasicsCard profile={profile} onChanged={(next) => void handleProfileChanged(next)} onError={setError} />
          <ExperiencesCard profile={profile} onChanged={(next) => void handleProfileChanged(next)} onError={setError} />
          <EducationsCard profile={profile} onChanged={(next) => void handleProfileChanged(next)} onError={setError} />
          <SkillsCard profile={profile} onChanged={(next) => void handleProfileChanged(next)} onError={setError} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
