// Settings → Notifications (mobile twin of apps/web/src/app/[locale]/(app)/settings/notifications/page.tsx).
//
// Same NotificationPreferences Zod from @baydar/shared, same /me/notification-preferences endpoint.
// Locked-row treatment for `moderationAction` matches the web spec.

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences as NotificationPreferencesSchema,
  type NotificationPreferences,
} from "@baydar/shared";
import { Button, Surface, Switch, nativeTokens, useToast, useThemeTokens } from "@baydar/ui-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiCall, apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

type Channel = "email" | "push";

type EventKey =
  | "newConnection"
  | "newMessage"
  | "newComment"
  | "newReaction"
  | "jobMatch"
  | "applicationStatus"
  | "weeklyDigest"
  | "karamaUpdate"
  | "moderationAction";

interface EventGroup {
  key: string;
  events: EventKey[];
}

const EVENT_GROUPS: EventGroup[] = [
  { key: "social", events: ["newConnection", "newMessage", "newComment", "newReaction"] },
  { key: "career", events: ["jobMatch", "applicationStatus"] },
  { key: "account", events: ["weeklyDigest", "karamaUpdate", "moderationAction"] },
];

const LOCKED_EVENTS: ReadonlySet<EventKey> = new Set(["moderationAction"]);

export default function NotificationsSettingsScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [pristine, setPristine] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch(
          "/me/notification-preferences",
          NotificationPreferencesSchema,
          {},
        );
        if (cancelled) return;
        setPrefs(data);
        setPristine(data);
      } catch (e) {
        if (cancelled) return;
        setPrefs(DEFAULT_NOTIFICATION_PREFERENCES);
        setPristine(DEFAULT_NOTIFICATION_PREFERENCES);
        setError(apiErrorMessage(t, e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [t]);

  const dirty = useMemo(
    () => (prefs && pristine ? JSON.stringify(prefs) !== JSON.stringify(pristine) : false),
    [prefs, pristine],
  );

  async function save(): Promise<void> {
    if (!prefs) return;
    setSaving(true);
    setError(null);
    try {
      await apiCall("/me/notification-preferences", { method: "PATCH", body: prefs });
      setPristine(prefs);
      showToast({ message: t("settings.notifications.savedToast"), kind: "success" });
    } catch (e) {
      setError(apiErrorMessage(t, e));
    } finally {
      setSaving(false);
    }
  }

  function revert(): void {
    if (pristine) setPrefs(pristine);
  }

  function toggle(event: EventKey, channel: Channel): void {
    if (!prefs || LOCKED_EVENTS.has(event)) return;
    setPrefs({
      ...prefs,
      [event]: { ...prefs[event], [channel]: !prefs[event][channel] },
    });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surfaceMuted }}>
      <ScrollView
        contentContainerStyle={{ padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}
      >
        <View style={{ gap: nativeTokens.space[1] }}>
          <Text
            accessibilityRole="header"
            style={{
              color: c.ink,
              fontSize: nativeTokens.type.scale.h1.size,
              lineHeight: nativeTokens.type.scale.h1.line,
              fontWeight: "700",
              textAlign: "auto",
            }}
          >
            {t("settings.notifications.title")}
          </Text>
          <Text
            style={{
              color: c.inkMuted,
              fontSize: nativeTokens.type.scale.small.size,
              lineHeight: nativeTokens.type.scale.small.line,
              textAlign: "auto",
            }}
          >
            {t("settings.notifications.subtitle")}
          </Text>
        </View>

        {loading ? (
          <Surface variant="card" padding="6">
            <Text style={{ color: c.inkMuted }}>{t("common.loading")}</Text>
          </Surface>
        ) : prefs ? (
          <>
            {EVENT_GROUPS.map((group) => (
              <Surface key={group.key} variant="card" padding="0">
                <View
                  style={{
                    paddingHorizontal: nativeTokens.space[4],
                    paddingVertical: nativeTokens.space[3],
                    borderBottomWidth: 1,
                    borderBottomColor: c.lineSoft,
                  }}
                >
                  <Text
                    style={{
                      color: c.ink,
                      fontSize: nativeTokens.type.scale.body.size,
                      fontWeight: "600",
                      textAlign: "auto",
                    }}
                  >
                    {t(`settings.notifications.groups.${group.key}.title`)}
                  </Text>
                  <Text
                    style={{
                      color: c.inkMuted,
                      fontSize: nativeTokens.type.scale.small.size,
                      marginTop: 2,
                      textAlign: "auto",
                    }}
                  >
                    {t(`settings.notifications.groups.${group.key}.desc`)}
                  </Text>
                </View>
                {group.events.map((event) => {
                  const locked = LOCKED_EVENTS.has(event);
                  return (
                    <View
                      key={event}
                      style={{
                        paddingHorizontal: nativeTokens.space[4],
                        paddingVertical: nativeTokens.space[3],
                        borderBottomWidth: 1,
                        borderBottomColor: c.lineSoft,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: nativeTokens.space[3],
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{
                            color: c.ink,
                            fontSize: nativeTokens.type.scale.body.size,
                            fontWeight: "500",
                            textAlign: "auto",
                          }}
                        >
                          {t(`settings.notifications.events.${event}.title`)}
                        </Text>
                        <Text
                          style={{
                            color: c.inkMuted,
                            fontSize: nativeTokens.type.scale.small.size,
                            marginTop: 2,
                            textAlign: "auto",
                          }}
                        >
                          {t(`settings.notifications.events.${event}.desc`)}
                        </Text>
                      </View>
                      <View style={{ alignItems: "center", width: 56 }}>
                        <Text
                          style={{
                            color: c.inkSubtle,
                            fontSize: nativeTokens.type.scale.micro.size,
                            fontWeight: "600",
                            marginBottom: 4,
                          }}
                        >
                          {t("settings.notifications.emailHeader")}
                        </Text>
                        <Switch
                          ariaLabel={`${t(`settings.notifications.events.${event}.title`)} — ${t("settings.notifications.emailHeader")}`}
                          checked={prefs[event].email}
                          onChange={() => toggle(event, "email")}
                          disabled={locked || saving}
                        />
                      </View>
                      <View style={{ alignItems: "center", width: 56 }}>
                        <Text
                          style={{
                            color: c.inkSubtle,
                            fontSize: nativeTokens.type.scale.micro.size,
                            fontWeight: "600",
                            marginBottom: 4,
                          }}
                        >
                          {t("settings.notifications.pushHeader")}
                        </Text>
                        <Switch
                          ariaLabel={`${t(`settings.notifications.events.${event}.title`)} — ${t("settings.notifications.pushHeader")}`}
                          checked={prefs[event].push}
                          onChange={() => toggle(event, "push")}
                          disabled={locked || saving}
                        />
                      </View>
                    </View>
                  );
                })}
              </Surface>
            ))}

            {error ? <Text style={{ color: c.danger, textAlign: "auto" }}>{error}</Text> : null}

            <View
              style={{
                flexDirection: "row",
                gap: nativeTokens.space[2],
                marginTop: nativeTokens.space[2],
              }}
            >
              <Button
                variant="primary"
                size="md"
                onPress={() => void save()}
                loading={saving}
                disabled={!dirty}
              >
                {saving ? t("common.saving") : t("common.save")}
              </Button>
              <Button variant="secondary" size="md" onPress={revert} disabled={!dirty || saving}>
                {t("common.revert")}
              </Button>
              {dirty ? (
                <Text
                  style={{
                    color: c.inkMuted,
                    fontSize: nativeTokens.type.scale.small.size,
                    alignSelf: "center",
                  }}
                >
                  {t("settings.notifications.unsavedChanges")}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
