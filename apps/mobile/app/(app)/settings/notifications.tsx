import {
  NotificationPreferences,
  type NotificationChannel,
  type NotificationEvent,
} from "@palnet/shared";
import { Button, Surface, Switch, nativeTokens } from "@palnet/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, View } from "react-native";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const PreferencesEnvelope = z.object({ preferences: NotificationPreferences });

const CHANNELS: NotificationChannel[] = ["inApp", "email", "push"];
const EVENTS: NotificationEvent[] = ["connections", "messages", "reactions", "comments", "jobs"];

export default function SettingsNotificationsScreen(): JSX.Element {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const load = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }

    setLoading(true);
    setStatus("idle");
    try {
      const data = await apiFetch("/notifications/preferences", PreferencesEnvelope, { token });
      setPrefs(data.preferences);
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function toggle(channel: NotificationChannel, event: NotificationEvent): void {
    setPrefs((current) =>
      current === null
        ? current
        : {
            ...current,
            [channel]: {
              ...current[channel],
              [event]: !current[channel][event],
            },
          },
    );
    setStatus("idle");
  }

  async function save(): Promise<void> {
    if (!prefs) return;

    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }

    setBusy(true);
    setStatus("idle");
    try {
      const data = await apiFetch("/notifications/preferences", PreferencesEnvelope, {
        method: "POST",
        body: prefs,
        token,
      });
      setPrefs(data.preferences);
      setStatus("ok");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
      testID="settings-notifications-screen"
    >
      <ScrollView
        contentContainerStyle={{
          padding: nativeTokens.space[4],
          gap: nativeTokens.space[3],
        }}
      >
        <Surface variant="card" padding="4">
          <View style={{ gap: nativeTokens.space[1] }}>
            <Text
              style={{
                color: nativeTokens.color.ink,
                fontSize: nativeTokens.type.scale.h3.size,
                fontWeight: "700",
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {t("settings.notificationPrefs.title", {
                defaultValue: "Notification preferences",
              })}
            </Text>
            <Text
              style={{
                color: nativeTokens.color.inkMuted,
                fontSize: nativeTokens.type.scale.small.size,
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {t("settings.notificationPrefs.description", {
                defaultValue: "Choose what you receive and how.",
              })}
            </Text>
          </View>
        </Surface>

        {loading ? (
          <Surface variant="card" padding="6">
            <View
              style={{
                minHeight: 120,
                alignItems: "center",
                justifyContent: "center",
              }}
              testID="settings-notifications-loading"
            >
              <ActivityIndicator />
            </View>
          </Surface>
        ) : null}

        {!loading && prefs
          ? EVENTS.map((event) => (
              <Surface key={event} variant="card" padding="4">
                <View style={{ gap: nativeTokens.space[3] }}>
                  <Text
                    style={{
                      color: nativeTokens.color.ink,
                      fontSize: nativeTokens.type.scale.body.size,
                      fontWeight: "700",
                      fontFamily: nativeTokens.type.family.sans,
                    }}
                  >
                    {t(`settings.notificationPrefs.events.${event}`, {
                      defaultValue: event,
                    })}
                  </Text>

                  {CHANNELS.map((channel) => (
                    <View
                      key={channel}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: nativeTokens.space[3],
                      }}
                    >
                      <Text
                        style={{
                          color: nativeTokens.color.inkMuted,
                          fontSize: nativeTokens.type.scale.small.size,
                          fontFamily: nativeTokens.type.family.sans,
                        }}
                      >
                        {t(`settings.notificationPrefs.channels.${channel}`, {
                          defaultValue: channel,
                        })}
                      </Text>
                      <Switch
                        testID={`settings-notification-${event}-${channel}`}
                        value={prefs[channel][event]}
                        onValueChange={() => toggle(channel, event)}
                        accessibilityLabel={`${t(
                          `settings.notificationPrefs.events.${event}`,
                        )} · ${t(`settings.notificationPrefs.channels.${channel}`)}`}
                      />
                    </View>
                  ))}
                </View>
              </Surface>
            ))
          : null}

        {!loading && status === "error" ? (
          <Surface variant="card" padding="4">
            <Text
              testID="settings-notifications-status-error"
              style={{
                color: nativeTokens.color.danger,
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {t("settings.notificationPrefs.genericError", {
                defaultValue: "Could not save preferences.",
              })}
            </Text>
          </Surface>
        ) : null}

        {!loading && status === "ok" ? (
          <Surface variant="card" padding="4">
            <Text
              testID="settings-notifications-status-ok"
              style={{
                color: nativeTokens.color.success,
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {t("settings.notificationPrefs.saveOk", {
                defaultValue: "Preferences saved.",
              })}
            </Text>
          </Surface>
        ) : null}

        <Button
          onPress={() => void save()}
          disabled={!prefs}
          loading={busy}
          fullWidth
          testID="settings-notifications-save"
        >
          {t("common.save", { defaultValue: "Save" })}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
