import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from "react-native";

import { apiCall } from "@/lib/api";

type Status = "verifying" | "ok" | "error" | "missing";

export default function VerifyEmailScreen(): JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [status, setStatus] = useState<Status>(token ? "verifying" : "missing");

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        await apiCall("/auth/email/verify", {
          method: "POST",
          body: { token },
        });
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    })();
  }, [token]);

  return (
    <SafeAreaView className="bg-surface-muted flex-1" testID="auth-verify-screen">
      <View className="flex-1 gap-4 px-6 pt-12">
        <Text className="text-ink text-3xl font-bold">{t("verifyEmail.title")}</Text>

        {status === "verifying" ? (
          <View className="flex-row items-center gap-3">
            <ActivityIndicator />
            <Text className="text-ink-muted">{t("verifyEmail.verifying")}</Text>
          </View>
        ) : null}

        {status === "ok" ? (
          <>
            <Text className="text-ink">{t("verifyEmail.success")}</Text>
            <Pressable
              testID="auth-verify-go-feed"
              onPress={() => router.replace("/(app)/feed")}
              className="bg-brand-600 mt-2 rounded-md px-6 py-3"
            >
              <Text className="text-ink-inverse text-center">{t("verifyEmail.goFeed")}</Text>
            </Pressable>
          </>
        ) : null}

        {status === "error" ? (
          <Text testID="auth-verify-error" className="text-danger" accessibilityRole="alert">
            {t("verifyEmail.invalid")}
          </Text>
        ) : null}

        {status === "missing" ? (
          <Text testID="auth-verify-missing" className="text-ink-muted">
            {t("verifyEmail.missingToken")}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
