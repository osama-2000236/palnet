import { tokens } from "@baydar/ui-tokens";
import { router } from "expo-router";
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
    <SafeAreaView className="flex-1 bg-surface-muted">
      <View className="flex-1 gap-4 px-6 pt-12">
        <Text className="text-3xl font-bold text-ink">{t("auth.login")}</Text>

        <View className="flex-col gap-1">
          <Text className="text-sm text-ink-muted">{t("auth.email")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            className="rounded-md border border-ink-muted/30 bg-surface px-3 py-2 text-ink"
          />
        </View>

        <View className="flex-col gap-1">
          <Text className="text-sm text-ink-muted">{t("auth.password")}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            className="rounded-md border border-ink-muted/30 bg-surface px-3 py-2 text-ink"
          />
        </View>

        {error ? (
          <Text className="text-sm text-danger" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={onSubmit}
          disabled={busy}
          className="rounded-md bg-brand-600 px-6 py-3 shadow-card"
        >
          {busy ? (
            <ActivityIndicator color={tokens.color.ink.inverse} />
          ) : (
            <Text className="text-center text-ink-inverse">{t("auth.submitLogin")}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.replace("/(auth)/register")}>
          <Text className="text-center text-brand-600">{t("auth.toRegister")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
