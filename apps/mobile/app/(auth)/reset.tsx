import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiRequestError, apiCall } from "@/lib/api";

type Status = "idle" | "submitting" | "done" | "missing";

export default function ResetPasswordScreen(): JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(token ? "idle" : "missing");

  async function onSubmit(): Promise<void> {
    setError(null);
    setStatus("submitting");
    try {
      await apiCall("/auth/password/reset", {
        method: "POST",
        body: { token, newPassword: password },
      });
      setStatus("done");
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(
          t(`auth.errors.${e.code}`, { defaultValue: t("auth.errors.INTERNAL") }),
        );
      } else {
        setError(t("auth.errors.INTERNAL"));
      }
      setStatus("idle");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" testID="auth-reset-screen">
      <View className="flex-1 gap-4 px-6 pt-12">
        <Text className="text-3xl font-bold text-ink">
          {t("resetPassword.title")}
        </Text>

        {status === "missing" ? (
          <Text testID="auth-reset-missing" className="text-ink-muted">
            {t("resetPassword.missingToken")}
          </Text>
        ) : null}

        {status === "done" ? (
          <>
            <Text className="text-ink">{t("resetPassword.success")}</Text>
            <Pressable
              testID="auth-reset-to-login"
              onPress={() => router.replace("/(auth)/login")}
              className="mt-2 rounded-md bg-brand-600 px-6 py-3"
            >
              <Text className="text-center text-ink-inverse">
                {t("resetPassword.toLogin")}
              </Text>
            </Pressable>
          </>
        ) : null}

        {(status === "idle" || status === "submitting") && token ? (
          <>
            <View className="flex-col gap-1">
              <Text className="text-sm text-ink-muted">
                {t("resetPassword.newPassword")}
              </Text>
              <TextInput
                testID="auth-reset-password-input"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
                className="rounded-md border border-ink-muted/30 bg-surface px-3 py-2 text-ink"
              />
            </View>

            {error ? (
              <Text
                testID="auth-reset-error"
                className="text-sm text-danger"
                accessibilityRole="alert"
              >
                {error}
              </Text>
            ) : null}

            <Pressable
              testID="auth-reset-submit"
              onPress={onSubmit}
              disabled={status === "submitting" || password.length < 8}
              className="rounded-md bg-brand-600 px-6 py-3"
            >
              {status === "submitting" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-ink-inverse">
                  {t("resetPassword.submit")}
                </Text>
              )}
            </Pressable>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
