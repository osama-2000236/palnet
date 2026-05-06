import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiCall } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { clearSession } from "@/lib/session";

const CONFIRMATION = "DELETE_MY_ACCOUNT";

export default function AccountSettingsScreen(): JSX.Element {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState<"delete" | null>(null);

  function exportData(): void {
    Alert.alert(t("account.export.title"), t("account.export.missingSharing"));
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
      Alert.alert(t("account.delete.title"), apiErrorMessage(t, caught));
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {t("account.title")}
        </Text>

        <Surface variant="flat" padding="4" style={styles.section}>
          <Text style={styles.sectionTitle}>{t("account.export.title")}</Text>
          <Text style={styles.copy}>{t("account.export.body")}</Text>
          <Button variant="secondary" onPress={exportData}>
            {t("account.export.button")}
          </Button>
        </Surface>

        <Surface variant="flat" padding="4" style={styles.section}>
          <Text style={styles.dangerTitle}>{t("account.delete.title")}</Text>
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
            <TextInput
              value={phrase}
              onChangeText={setPhrase}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  body: {
    padding: nativeTokens.space[4],
    gap: nativeTokens.space[4],
  },
  title: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h1.size,
    lineHeight: nativeTokens.type.scale.h1.line,
    fontWeight: "700",
  },
  section: {
    gap: nativeTokens.space[3],
  },
  sectionTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
  },
  dangerTitle: {
    color: nativeTokens.color.danger,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
  },
  copy: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: nativeTokens.space[4],
  },
  modal: {
    gap: nativeTokens.space[3],
    borderRadius: nativeTokens.radius.lg,
    backgroundColor: nativeTokens.color.surface,
    padding: nativeTokens.space[4],
  },
  input: {
    borderWidth: 1,
    borderColor: nativeTokens.color.lineHard,
    borderRadius: nativeTokens.radius.md,
    color: nativeTokens.color.ink,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[2],
    fontFamily: nativeTokens.type.family.mono,
    writingDirection: "ltr",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
  },
});
