import { CreatePostBody, formatNumber, MediaKind, type MediaRef, Post } from "@baydar/shared";
import { Avatar, Button, Icon, Surface, nativeTokens, type AvatarUser } from "@baydar/ui-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch, ApiRequestError } from "@/lib/api";
import { track } from "@/lib/analytics";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession } from "@/lib/session";
import { uploadAsset } from "@/lib/uploads";

const MAX_BODY = 3000;
const MAX_MEDIA = 8;

export default function ComposerScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaRef[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState<AvatarUser | null>(null);

  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) return;
      const handle = session.user.email.split("@")[0] ?? session.user.email;
      setAuthor({
        id: session.user.id,
        handle,
        firstName: handle,
        lastName: "",
        avatarUrl: null,
      });
    })();
  }, []);

  async function pickImage(): Promise<void> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const token = await getAccessToken();
    if (!token) return;
    setUploading(true);
    try {
      const uploaded = await uploadAsset({
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
          url: uploaded.publicUrl,
          kind: MediaKind.IMAGE,
          mimeType: asset.mimeType ?? "image/jpeg",
          width: asset.width ?? null,
          height: asset.height ?? null,
          sizeBytes: asset.fileSize ?? null,
          blurhash: uploaded.blurhash,
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
      tapHaptic();
      await apiFetch("/posts", Post, {
        method: "POST",
        body: parsed.data,
        token,
      });
      successHaptic();
      track("post.create", { mediaCount: media.length });
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

  const charCount = t("composer.charCount", {
    current: formatNumber(body.length, i18n.language),
    max: formatNumber(MAX_BODY, i18n.language),
  });

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.content}
      >
        <Text style={styles.title}>{t("composer.title")}</Text>

        <Surface variant="tinted" padding="3" style={styles.authorChip}>
          <Avatar user={author} size="sm" />
          <Text style={styles.authorText}>{author?.handle ?? t("common.appName")}</Text>
        </Surface>

        <Surface variant="flat" padding="4">
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t("composer.placeholder")}
            placeholderTextColor={nativeTokens.color.inkMuted}
            multiline
            maxLength={MAX_BODY}
            style={styles.bodyInput}
            textAlignVertical="top"
          />
        </Surface>
        <Text style={styles.counter}>{charCount}</Text>

        {media.length > 0 ? (
          <View style={styles.mediaGrid}>
            {media.map((m, i) => (
              <Pressable
                key={m.url}
                onPress={() => setMedia((prev) => prev.filter((_, j) => j !== i))}
                accessibilityRole="button"
                accessibilityLabel={t("composer.removeImage")}
                style={styles.mediaThumbWrap}
              >
                <Image
                  source={{ uri: m.url }}
                  style={styles.mediaThumb}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  placeholder={m.blurhash ? { blurhash: m.blurhash } : undefined}
                />
                <View style={styles.removeBadge}>
                  <Icon
                    name="x"
                    size={nativeTokens.space[4]}
                    color={nativeTokens.color.inkInverse}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            variant="secondary"
            size="md"
            leading={
              <Icon name="image" size={nativeTokens.space[5]} color={nativeTokens.color.ink} />
            }
            onPress={pickImage}
            disabled={uploading || media.length >= MAX_MEDIA}
            accessibilityLabel={t("composer.addImage")}
          >
            {uploading ? t("composer.uploading") : t("composer.addImage")}
          </Button>
        </View>

        {error ? (
          <Surface variant="tinted" padding="3" accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
          </Surface>
        ) : null}

        <Button
          variant="accent"
          size="lg"
          fullWidth
          onPress={submit}
          disabled={body.trim().length === 0}
          loading={busy}
          accessibilityLabel={t("composer.submit")}
        >
          {t("composer.submit")}
        </Button>

        <Button
          variant="ghost"
          size="md"
          fullWidth
          onPress={() => router.back()}
          accessibilityLabel={t("common.cancel")}
        >
          {t("common.cancel")}
        </Button>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  content: {
    flex: 1,
    gap: nativeTokens.space[3],
    paddingHorizontal: nativeTokens.space[4],
    paddingTop: nativeTokens.space[8],
  },
  title: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.display.size,
    lineHeight: nativeTokens.type.scale.display.line,
    fontWeight: "700",
    fontFamily: nativeTokens.type.family.sans,
  },
  authorChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
  },
  authorText: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    fontFamily: nativeTokens.type.family.sans,
  },
  bodyInput: {
    minHeight: nativeTokens.space[20] * 2,
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    fontFamily: nativeTokens.type.family.body,
  },
  counter: {
    alignSelf: "flex-end",
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.caption.size,
    fontFamily: nativeTokens.type.family.mono,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
  },
  mediaThumbWrap: {
    width: nativeTokens.space[20],
    height: nativeTokens.space[20],
  },
  mediaThumb: {
    width: "100%",
    height: "100%",
    borderRadius: nativeTokens.radius.md,
  },
  removeBadge: {
    position: "absolute",
    top: nativeTokens.space[1],
    end: nativeTokens.space[1],
    width: nativeTokens.space[6],
    height: nativeTokens.space[6],
    borderRadius: nativeTokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: nativeTokens.color.accent600,
  },
  actions: {
    flexDirection: "row",
    gap: nativeTokens.space[2],
  },
  errorText: {
    color: nativeTokens.color.danger,
    fontSize: nativeTokens.type.scale.small.size,
    fontFamily: nativeTokens.type.family.sans,
  },
});
