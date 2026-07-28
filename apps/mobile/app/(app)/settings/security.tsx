// Settings → Security — native twin of apps/web/.../settings/security/page.tsx.
//
// This screen used to be three static rows saying the controls were "قريبًا".
// They were not: `POST /auth/change-password`, `GET /auth/sessions`,
// `DELETE /auth/sessions/others` and `DELETE /auth/sessions/:deviceId` have been
// live for months and the web app has used all four. The placeholder told phone
// users a capability they already had did not exist.
//
// 2FA really is unbuilt, so that row keeps its "قريبًا" state.

import { ActiveSession as ActiveSessionSchema, Password, type ActiveSession } from "@baydar/shared";
import { Banner, Button, Chip, Surface, useToast } from "@baydar/ui-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { StateMessage } from "@/components/StateMessage";
import { apiCall, apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getDeviceId } from "@/lib/session";
import { PasswordField, SessionRow, useSecurityStyles } from "@/screens/security/Parts";

const SessionsEnvelope = z.array(ActiveSessionSchema);

export default function SecuritySettingsScreen(): JSX.Element {
  const styles = useSecurityStyles();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [deviceId, setDeviceId] = useState<string>("");
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    void getDeviceId().then(setDeviceId);
  }, []);

  const loadSessions = useCallback(async (): Promise<void> => {
    setSessionsError(null);
    try {
      setSessions(await apiFetch("/auth/sessions", SessionsEnvelope));
    } catch (e) {
      setSessionsError(apiErrorMessage(t, e));
    }
  }, [t]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const onChangePassword = async (): Promise<void> => {
    setPwError(null);
    // The server's own schema, so client and API can never drift.
    if (!Password.safeParse(newPw).success) {
      setPwError(t("settings.security.password.tooShort"));
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(t("settings.security.password.mismatch"));
      return;
    }
    if (newPw === currentPw) {
      setPwError(t("settings.security.password.sameAsOld"));
      return;
    }
    setPwBusy(true);
    try {
      await apiCall("/auth/change-password", {
        method: "POST",
        body: { currentPassword: currentPw, newPassword: newPw, deviceId },
      });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      showToast({ message: t("settings.security.password.savedToast"), kind: "success" });
    } catch (e) {
      setPwError(apiErrorMessage(t, e));
    } finally {
      setPwBusy(false);
    }
  };

  const revoke = async (path: string, toastKey: string): Promise<void> => {
    try {
      await apiCall(path, { method: "DELETE", body: { deviceId } });
      showToast({ message: t(toastKey), kind: "success" });
      await loadSessions();
    } catch (e) {
      showToast({ message: apiErrorMessage(t, e), kind: "error" });
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View style={styles.headerBlock}>
          <Text accessibilityRole="header" style={styles.title}>
            {t("settings.security.title")}
          </Text>
          <Text style={styles.subtitle}>{t("settings.security.subtitle")}</Text>
        </View>

        <Surface variant="card" padding="4" style={styles.card}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{t("settings.security.password.title")}</Text>
            <Text style={styles.sectionDesc}>{t("settings.security.password.desc")}</Text>
          </View>
          <PasswordField
            label={t("settings.security.password.current")}
            value={currentPw}
            onChangeText={setCurrentPw}
            autoComplete="current-password"
          />
          <PasswordField
            label={t("settings.security.password.new")}
            value={newPw}
            onChangeText={setNewPw}
            autoComplete="new-password"
            helperText={t("settings.security.password.requirements")}
          />
          <PasswordField
            label={t("settings.security.password.confirm")}
            value={confirmPw}
            onChangeText={setConfirmPw}
            autoComplete="new-password"
          />
          {pwError ? <Banner kind="danger">{pwError}</Banner> : null}
          <Button
            variant="primary"
            fullWidth
            loading={pwBusy}
            disabled={!currentPw || !newPw || !confirmPw}
            onPress={() => void onChangePassword()}
            accessibilityLabel={t("settings.security.password.button")}
          >
            {t("settings.security.password.button")}
          </Button>
        </Surface>

        <Surface variant="card" padding="4" style={styles.card}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{t("settings.security.sessions.title")}</Text>
            <Text style={styles.sectionDesc}>{t("settings.security.sessions.desc")}</Text>
          </View>
          {sessionsError ? (
            <StateMessage
              message={sessionsError}
              actionLabel={t("common.retry")}
              onAction={() => void loadSessions()}
            />
          ) : sessions === null ? (
            <Text style={styles.sectionDesc}>{t("common.loading")}</Text>
          ) : sessions.length === 0 ? (
            <Text style={styles.sectionDesc}>{t("settings.security.sessions.empty")}</Text>
          ) : (
            <>
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isThisDevice={session.id === deviceId}
                  onSignOut={() =>
                    void revoke(
                      `/auth/sessions/${encodeURIComponent(session.id)}`,
                      "settings.security.sessions.revokedToast",
                    )
                  }
                />
              ))}
              <Button
                variant="secondary"
                fullWidth
                onPress={() =>
                  void revoke(
                    "/auth/sessions/others",
                    "settings.security.sessions.signedOutOthersToast",
                  )
                }
                accessibilityLabel={t("settings.security.sessions.signOutOthers")}
              >
                {t("settings.security.sessions.signOutOthers")}
              </Button>
            </>
          )}
        </Surface>

        <Surface variant="card" padding="4" style={styles.card}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{t("settings.security.twoFactor.title")}</Text>
            <Text style={styles.sectionDesc}>{t("settings.security.twoFactor.desc")}</Text>
          </View>
          <View style={styles.chipRow}>
            <Chip>{t("settings.security.twoFactor.comingSoon")}</Chip>
          </View>
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}
