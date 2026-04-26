import { SessionList, type SessionInfo } from "@baydar/shared";
import { Button, Surface, nativeTokens } from "@baydar/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, View } from "react-native";

import { apiCall, apiFetch } from "@/lib/api";
import { getAccessToken, getDeviceId } from "@/lib/session";

export default function SettingsSessionsScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const deviceId = await getDeviceId();
      const data = await apiFetch("/account/sessions", SessionList, {
        token,
        headers: { "x-device-id": deviceId },
      });
      setSessions(data.sessions);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function performRevoke(sessionId: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }

    setBusyId(sessionId);
    setError(false);
    try {
      await apiCall(`/account/sessions/${sessionId}/revoke`, {
        method: "POST",
        token,
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function performRevokeAll(): Promise<void> {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }

    setBusyAll(true);
    setError(false);
    try {
      await apiCall("/account/sessions/revoke-all", {
        method: "POST",
        token,
        body: { keepDeviceId: await getDeviceId() },
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusyAll(false);
    }
  }

  function confirmRevoke(session: SessionInfo): void {
    Alert.alert(
      shortUA(session.userAgent ?? "", t),
      t("settings.sessionsInfo.revokeConfirmBody", {
        defaultValue: "Sign this device out of your account?",
      }),
      [
        {
          text: t("common.cancel", { defaultValue: "Cancel" }),
          style: "cancel",
        },
        {
          text: t("settings.sessionsInfo.revoke", { defaultValue: "Revoke" }),
          style: "destructive",
          onPress: () => {
            void performRevoke(session.id);
          },
        },
      ],
    );
  }

  function confirmRevokeAll(): void {
    Alert.alert(
      t("settings.sessionsInfo.revokeAllConfirmTitle", {
        defaultValue: "Sign out everywhere else?",
      }),
      t("settings.sessionsInfo.revokeAllConfirmBody", {
        defaultValue: "All other devices will be signed out. This device stays signed in.",
      }),
      [
        {
          text: t("common.cancel", { defaultValue: "Cancel" }),
          style: "cancel",
        },
        {
          text: t("settings.sessionsInfo.revokeAll", {
            defaultValue: "Sign out everywhere else",
          }),
          style: "destructive",
          onPress: () => {
            void performRevokeAll();
          },
        },
      ],
    );
  }

  const canRevokeAll = !busyAll && !!sessions && sessions.some((session) => !session.current);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
      testID="settings-sessions-screen"
    >
      <ScrollView
        contentContainerStyle={{
          padding: nativeTokens.space[4],
          gap: nativeTokens.space[3],
        }}
      >
        <Surface variant="card" padding="4">
          <View style={{ gap: nativeTokens.space[3] }}>
            <View style={{ gap: nativeTokens.space[1] }}>
              <Text
                style={{
                  color: nativeTokens.color.ink,
                  fontSize: nativeTokens.type.scale.h3.size,
                  fontWeight: "700",
                  fontFamily: nativeTokens.type.family.sans,
                }}
              >
                {t("settings.sessions", { defaultValue: "Sessions" })}
              </Text>
              <Text
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontSize: nativeTokens.type.scale.small.size,
                  fontFamily: nativeTokens.type.family.sans,
                }}
              >
                {t("settings.sessionsInfo.description", {
                  defaultValue: "Devices currently signed in to your account.",
                })}
              </Text>
            </View>
            <Button
              variant="secondary"
              size="sm"
              onPress={confirmRevokeAll}
              disabled={!canRevokeAll}
              loading={busyAll}
              testID="settings-sessions-revoke-all"
            >
              {t("settings.sessionsInfo.revokeAll", {
                defaultValue: "Sign out everywhere else",
              })}
            </Button>
          </View>
        </Surface>

        {loading ? (
          <Surface variant="card" padding="6">
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                minHeight: 120,
              }}
              testID="settings-sessions-loading"
            >
              <ActivityIndicator />
            </View>
          </Surface>
        ) : null}

        {!loading && error ? (
          <Surface variant="card" padding="4">
            <View style={{ gap: nativeTokens.space[3] }}>
              <Text
                testID="settings-sessions-error"
                style={{
                  color: nativeTokens.color.danger,
                  fontFamily: nativeTokens.type.family.sans,
                }}
              >
                {t("settings.sessionsInfo.genericError", {
                  defaultValue: "Could not revoke. Try again.",
                })}
              </Text>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => void load()}
                testID="settings-sessions-retry"
              >
                {t("common.retry", { defaultValue: "Retry" })}
              </Button>
            </View>
          </Surface>
        ) : null}

        {!loading && !error && sessions?.length === 0 ? (
          <Surface variant="card" padding="4">
            <Text
              testID="settings-sessions-empty"
              style={{
                color: nativeTokens.color.inkMuted,
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {t("settings.sessionsInfo.empty", {
                defaultValue: "No active sessions.",
              })}
            </Text>
          </Surface>
        ) : null}

        {!loading && !error && sessions
          ? sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                locale={i18n.language}
                busy={busyId === session.id}
                onRevoke={() => confirmRevoke(session)}
              />
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionCard({
  session,
  locale,
  busy,
  onRevoke,
}: {
  session: SessionInfo;
  locale: string;
  busy: boolean;
  onRevoke: () => void;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <Surface variant="card" padding="4">
      <View style={{ gap: nativeTokens.space[3] }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: nativeTokens.space[3],
          }}
        >
          <View style={{ flex: 1, gap: nativeTokens.space[1] }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: nativeTokens.space[2],
              }}
            >
              <Text
                style={{
                  color: nativeTokens.color.ink,
                  fontSize: nativeTokens.type.scale.body.size,
                  fontWeight: "600",
                  fontFamily: nativeTokens.type.family.sans,
                }}
              >
                {shortUA(session.userAgent ?? "", t)}
              </Text>
              {session.current ? (
                <View
                  style={{
                    borderRadius: nativeTokens.radius.full,
                    backgroundColor: nativeTokens.color.brand50,
                    paddingHorizontal: nativeTokens.space[2],
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    testID={session.current ? "settings-session-current-badge" : undefined}
                    style={{
                      color: nativeTokens.color.brand700,
                      fontSize: 11,
                      fontWeight: "700",
                      fontFamily: nativeTokens.type.family.sans,
                    }}
                  >
                    {t("settings.sessionsInfo.current", {
                      defaultValue: "This device",
                    })}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              style={{
                color: nativeTokens.color.inkMuted,
                fontSize: nativeTokens.type.scale.small.size,
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {(session.ipAddress ?? "—") +
                " · " +
                new Date(session.createdAt).toLocaleString(locale)}
            </Text>
          </View>

          {session.current ? null : (
            <Button variant="danger-ghost" size="sm" onPress={onRevoke} loading={busy}>
              {t("settings.sessionsInfo.revoke", { defaultValue: "Revoke" })}
            </Button>
          )}
        </View>
      </View>
    </Surface>
  );
}

function shortUA(ua: string, t: ReturnType<typeof useTranslation>["t"]): string {
  if (!ua) {
    return t("settings.sessionsInfo.unknownDevice", {
      defaultValue: "Unknown device",
    });
  }

  const lower = ua.toLowerCase();
  const os = lower.includes("windows")
    ? "Windows"
    : lower.includes("mac os")
      ? "macOS"
      : lower.includes("android")
        ? "Android"
        : lower.includes("iphone") || lower.includes("ios")
          ? "iOS"
          : lower.includes("linux")
            ? "Linux"
            : "Device";
  const browser =
    lower.includes("edg/") || lower.includes("edge/")
      ? "Edge"
      : lower.includes("chrome/")
        ? "Chrome"
        : lower.includes("firefox/")
          ? "Firefox"
          : lower.includes("safari/")
            ? "Safari"
            : "Browser";

  return `${browser} · ${os}`;
}
