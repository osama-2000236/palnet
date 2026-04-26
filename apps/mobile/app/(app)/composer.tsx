import { CreatePostBody, MediaKind, type MediaRef, Post } from "@baydar/shared";
import { tokens } from "@baydar/ui-tokens";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadAsset } from "@/lib/uploads";

export default function ComposerScreen(): JSX.Element {
  const { t } = useTranslation();
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaRef[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickImage(): Promise<void> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const token = await getAccessToken();
    if (!token) return;
    setUploading(true);
    try {
      const publicUrl = await uploadAsset({
        asset: {
          uri: asset.uri,
          mimeType: asset.mimeType ?? "image/jpeg",
          sizeBytes: asset.fileSize ?? 0,
          filename: asset.fileName ?? undefined,
        },
        purpose: "POST_MEDIA",
        token,
      });
      setMedia((prev) => [
        ...prev,
        {
          url: publicUrl,
          kind: MediaKind.IMAGE,
          mimeType: asset.mimeType ?? "image/jpeg",
          sizeBytes: asset.fileSize ?? null,
        },
      ]);
    } finally {
      setUploading(false);
    }
  }

  async function submit(): Promise<void> {
    setError(null);
    const parsed = CreatePostBody.safeParse({
      body,
      language: "ar",
      media,
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
      <View className="flex-1 gap-3 px-6 pt-8">
        <Text className="text-ink text-3xl font-bold">{t("composer.title")}</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={t("composer.placeholder")}
          multiline
          maxLength={3000}
          className="border-ink-muted/30 bg-surface text-ink min-h-[160px] rounded-md border p-3"
          textAlignVertical="top"
        />
        <Text className="text-ink-muted self-end text-xs">{body.length} / 3000</Text>

        {media.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {media.map((m, i) => (
              <Pressable
                key={m.url}
                onPress={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
              >
                <Image source={{ uri: m.url }} style={{ width: 80, height: 80, borderRadius: 6 }} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={pickImage}
          disabled={uploading || media.length >= 8}
          className="border-ink-muted/30 self-start rounded-md border px-3 py-2"
        >
          <Text className="text-ink text-sm">
            {uploading ? t("composer.uploading") : `+ ${t("composer.addImage")}`}
          </Text>
        </Pressable>

        {error ? (
          <Text className="text-danger text-sm" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={busy || body.trim().length === 0}
          className="bg-brand-600 shadow-card rounded-md px-6 py-3"
        >
          {busy ? (
            <ActivityIndicator color={tokens.color.ink.inverse} />
          ) : (
            <Text className="text-ink-inverse text-center">{t("composer.submit")}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <Text className="text-ink-muted text-center">{t("common.cancel")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
