import { tokens } from "@baydar/ui-tokens";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiRequestError, loginAction } from "@/lib/auth-actions";

export default function LoginScreen(): JSX.Element {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      await loginAction({ email, password });
      router.replace("/(app)/feed");
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(t(`auth.errors.${e.code}`, { defaultValue: t("auth.errors.INTERNAL") }));
      } else {
        setError(t("auth.errors.INTERNAL"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="bg-surface-muted flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 gap-4 px-6 pt-12">
          <Text className="text-ink text-3xl font-bold">{t("auth.login")}</Text>

          <View className="flex-col gap-1">
            <Text className="text-ink-muted text-sm">{t("auth.email")}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              className="border-ink-muted/30 bg-surface text-ink rounded-md border px-3 py-2"
            />
          </View>

          <View className="flex-col gap-1">
            <Text className="text-ink-muted text-sm">{t("auth.password")}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              className="border-ink-muted/30 bg-surface text-ink rounded-md border px-3 py-2"
            />
          </View>

          {error ? (
            <Text className="text-danger text-sm" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={busy}
            className="bg-brand-600 shadow-card rounded-md px-6 py-3"
          >
            {busy ? (
              <ActivityIndicator color={tokens.color.ink.inverse} />
            ) : (
              <Text className="text-ink-inverse text-center">{t("auth.submitLogin")}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace("/(auth)/register")}>
            <Text className="text-brand-600 text-center">{t("auth.toRegister")}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
