import { AuthSession } from "@baydar/shared";
import {
  Button,
  Input,
  Surface,
  nativeTokens,
  useToast,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
// eslint-disable-next-line import/no-unresolved -- dependency is pinned for Expo install; absent only in this offline sandbox.
import * as Sharing from "expo-sharing";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Modal, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE, apiCall, apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { sendVerifyEmailAction } from "@/lib/auth-actions";
import { clearSession, getAccessToken } from "@/lib/session";

const MeUser = AuthSession.shape.user;

const CONFIRMATION = "DELETE_MY_ACCOUNT";

export default function AccountSettingsScreen(): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState<"export" | "delete" | "verify" | null>(null);
  const [me, setMe] = useState<{ email: string; emailVerified: string | null } | null>(null);
  const badgeStyle = [
    styles.badge,
    me?.emailVerified ? styles.verifiedBadge : styles.unverifiedBadge,
  ];

  useEffect(() => {
    let cancelled = false;
    apiFetch("/auth/me", MeUser)
      .then((user) => {
        if (!cancelled) setMe({ email: user.email, emailVerified: user.emailVerified ?? null });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function sendVerification(): Promise<void> {
    if (!me) return;
    setBusy("verify");
    try {
      await sendVerifyEmailAction(me.email);
      showToast({ message: t("account.email.sentToast"), kind: "success" });
    } catch {
      showToast({ message: t("account.email.error"), kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function exportData(): Promise<void> {
    setBusy("export");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("AUTH_UNAUTHORIZED");

      if (!(await Sharing.isAvailableAsync())) {
        showToast({ message: t("account.export.sharingUnavailable"), kind: "error" });
        return;
      }

      const response = await fetch(`${API_BASE}/account/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("EXPORT_FAILED");

      const raw = await response.text();
      let body: string;
      try {
        body = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        body = raw;
      }
      const root = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!root) throw new Error("FILE_SYSTEM_UNAVAILABLE");

      const uri = `${root}baydar-export-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, body, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(uri, {
        dialogTitle: t("account.export.title"),
        mimeType: "application/json",
        UTI: "public.json",
      });
      showToast({ message: t("account.export.success"), kind: "success" });
    } catch {
      showToast({ message: t("account.export.error"), kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount(): Promise<void> {
    setBusy("delete");
    try {
      await apiCall("/account/delete", {
        method: "POST",
        body: { confirmation: CONFIRMATION },
      });
      await clearSession();
      router.replace("/(auth)/login");
    } catch (caught) {
      showToast({ message: apiErrorMessage(t, caught), kind: "error" });
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("account.title")}
        </Text>

        {me ? (
          <Surface variant="flat" padding="4" style={styles.section}>
            <Text style={styles.sectionTitle}>{t("account.email.title")}</Text>
            <View style={styles.emailRow}>
              <Text style={styles.emailText}>{me.email}</Text>
              <Text style={badgeStyle}>
                {me.emailVerified ? t("account.email.verified") : t("account.email.unverified")}
              </Text>
            </View>
            {me.emailVerified ? null : (
              <>
                <Text style={styles.copy}>{t("account.email.body")}</Text>
                <Button
                  variant="secondary"
                  loading={busy === "verify"}
                  disabled={busy !== null}
                  testID="account-send-verification"
                  accessibilityLabel={t("account.email.sendButton")}
                  onPress={() => void sendVerification()}
                >
                  {t("account.email.sendButton")}
                </Button>
              </>
            )}
          </Surface>
        ) : null}

        <Surface variant="flat" padding="4" style={styles.section}>
          <Text style={styles.sectionTitle}>{t("account.export.title")}</Text>
          <Text style={styles.copy}>{t("account.export.body")}</Text>
          <Button
            variant="secondary"
            loading={busy === "export"}
            disabled={busy !== null}
            onPress={() => void exportData()}
          >
            {busy === "export" ? t("account.export.downloading") : t("account.export.button")}
          </Button>
        </Surface>

        <Surface variant="flat" padding="4" style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>{t("account.delete.title")}</Text>
          <Text style={styles.copy}>{t("account.delete.body")}</Text>
          <Button variant="danger-ghost" onPress={() => setConfirming(true)}>
            {t("account.delete.button")}
          </Button>
        </Surface>
      </View>

      <Modal transparent visible={confirming} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.sectionTitle}>{t("account.delete.confirmTitle")}</Text>
            <Text style={styles.copy}>{t("account.delete.confirmBody")}</Text>
            <Input
              fullWidth
              value={phrase}
              onChangeText={setPhrase}
              autoCapitalize="characters"
              autoCorrect={false}
              inputStyle={styles.input}
              accessibilityLabel={t("account.delete.confirmInput")}
            />
            <View style={styles.actions}>
              <Button
                variant="secondary"
                onPress={() => {
                  setConfirming(false);
                  setPhrase("");
                }}
              >
                {t("account.delete.cancel")}
              </Button>
              <Button
                variant="danger-ghost"
                disabled={phrase !== CONFIRMATION || busy !== null}
                loading={busy === "delete"}
                onPress={() => void deleteAccount()}
              >
                {t("account.delete.confirmButton")}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.surfaceMuted,
    },
    body: {
      padding: nativeTokens.space[4],
      gap: nativeTokens.space[4],
    },
    title: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h1.size,
      lineHeight: nativeTokens.type.scale.h1.line,
      fontWeight: "700",
    },
    section: {
      gap: nativeTokens.space[3],
    },
    sectionTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
    },
    dangerTitle: {
      color: c.danger,
    },
    copy: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    emailRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: nativeTokens.space[2],
    },
    emailText: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
      writingDirection: "ltr",
    },
    badge: {
      borderRadius: nativeTokens.radius.full,
      paddingHorizontal: nativeTokens.space[2],
      paddingVertical: 2,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      fontWeight: "600",
    },
    verifiedBadge: {
      color: c.brand700,
      backgroundColor: c.brand50,
    },
    unverifiedBadge: {
      color: c.inkMuted,
      backgroundColor: c.surfaceSubtle,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: c.scrim,
      padding: nativeTokens.space[4],
    },
    modal: {
      gap: nativeTokens.space[3],
      borderRadius: nativeTokens.radius.lg,
      backgroundColor: c.surface,
      padding: nativeTokens.space[4],
    },
    input: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.mono,
      writingDirection: "ltr",
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: nativeTokens.space[2],
    },
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
