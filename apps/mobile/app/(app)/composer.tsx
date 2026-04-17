import { CreatePostBody, Post } from "@palnet/shared";
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

import { apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function ComposerScreen(): JSX.Element {
  const { t } = useTranslation();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setError(null);
    const parsed = CreatePostBody.safeParse({
      body,
      language: "ar",
      media: [],
    });
    if (!parsed.success) {
      setError(t("auth.errors.VALIDATION_FAILED"));
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/posts", Post, {
        method: "POST",
        body: parsed.data,
        token,
      });
      router.replace("/(app)/feed");
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(
          t(`auth.errors.${e.code}`, { defaultValue: t("auth.errors.INTERNAL") }),
        );
      } else {
        setError(t("auth.errors.INTERNAL"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <View className="flex-1 gap-3 px-6 pt-8">
        <Text className="text-3xl font-bold text-ink">{t("composer.title")}</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={t("composer.placeholder")}
          multiline
          maxLength={3000}
          className="min-h-[160px] rounded-md border border-ink-muted/30 bg-white p-3 text-ink"
          textAlignVertical="top"
        />
        <Text className="self-end text-xs text-ink-muted">{body.length} / 3000</Text>

        {error ? (
          <Text className="text-sm text-red-600" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={busy || body.trim().length === 0}
          className="rounded-md bg-brand-600 px-6 py-3 shadow-card"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center text-white">{t("composer.submit")}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text className="text-center text-ink-muted">{t("common.cancel")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
