import {
  CreatePostBody,
  formatNumber,
  MediaKind,
  Post,
  Profile as ProfileSchema,
  type MediaRef,
} from "@baydar/shared";
import {
  AppHeader,
  Avatar,
  Button,
  Icon,
  Input,
  Surface,
  nativeTokens,
  type AvatarUser,
  useThemeTokens,
} from "@baydar/ui-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { track } from "@/lib/analytics";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken, readSession } from "@/lib/session";
import { uploadAsset } from "@/lib/uploads";

import { useStyles } from "@/screens/composer/styles";

const MAX_BODY = 3000;
const MAX_MEDIA = 8;

export default function ComposerScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
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
      try {
        const profile = await apiFetch("/profiles/me", ProfileSchema, {
          token: session.tokens.accessToken,
        });
        setAuthor({
          id: profile.userId,
          handle: profile.handle,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
        });
      } catch {
        // ponytail: offline fallback — email localpart beats an empty chip.
        const handle = session.user.email.split("@")[0] ?? session.user.email;
        setAuthor({
          id: session.user.id,
          handle,
          firstName: handle,
          lastName: "",
          avatarUrl: null,
        });
      }
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
    setError(null);
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
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
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
      // Clear the draft — expo-router keeps this screen mounted, so without a
      // reset the next compose reopens with the just-published text still in it.
      setBody("");
      setMedia([]);
      router.replace("/(app)/feed");
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
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
        <AppHeader
          title={t("composer.title")}
          compact
          trailing={
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.back()}
              accessibilityLabel={t("common.cancel")}
            >
              {t("common.cancel")}
            </Button>
          }
        />

        <Surface variant="tinted" padding="3" style={styles.authorChip}>
          <Avatar user={author} size="sm" />
          <Text style={styles.authorText}>
            {author ? `${author.firstName} ${author.lastName}`.trim() : t("common.appName")}
          </Text>
        </Surface>

        <Surface variant="flat" padding="4">
          <Input
            fullWidth
            testID="post-body-input"
            value={body}
            onChangeText={setBody}
            placeholder={t("composer.placeholder")}
            multiline
            maxLength={MAX_BODY}
            inputStyle={styles.bodyInput}
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
                  <Icon name="x" size={nativeTokens.space[4]} color={c.inkInverse} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            variant="secondary"
            size="md"
            leading={<Icon name="image" size={nativeTokens.space[5]} color={c.ink} />}
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
          testID="post-submit"
          variant="accent"
          size="lg"
          fullWidth
          onPress={submit}
          disabled={body.trim().length === 0}
          loading={busy}
          accessibilityLabel={t("composer.submit")}
          leading={<Icon name="send" size={18} color={c.inkInverse} />}
        >
          {t("composer.submit")}
        </Button>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
