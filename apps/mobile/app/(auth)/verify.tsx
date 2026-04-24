import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";

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
    <SafeAreaView className="flex-1 bg-surface-muted" testID="auth-verify-screen">
      <View className="flex-1 gap-4 px-6 pt-12">
        <Text className="text-3xl font-bold text-ink">
          {t("verifyEmail.title")}
        </Text>

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
              className="mt-2 rounded-md bg-brand-600 px-6 py-3"
            >
              <Text className="text-center text-ink-inverse">
                {t("verifyEmail.goFeed")}
              </Text>
            </Pressable>
          </>
        ) : null}

        {status === "error" ? (
          <Text
            testID="auth-verify-error"
            className="text-danger"
            accessibilityRole="alert"
          >
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
