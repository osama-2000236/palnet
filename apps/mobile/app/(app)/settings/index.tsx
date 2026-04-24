import { Avatar, Button, Icon, Surface, nativeTokens } from "@palnet/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { readSession } from "@/lib/session";

interface Row {
  key: string;
  icon: "settings" | "bell" | "users" | "shield-off";
  title: string;
  subtitle: string;
  onPress: () => void;
}

export default function SettingsIndexScreen(): JSX.Element {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const session = await readSession();
        if (!session) {
          router.replace("/(auth)/login");
          return;
        }
        setEmail(session.user.email);
      })();
    }, []),
  );

  const rows: Row[] = [
    {
      key: "account",
      icon: "settings",
      title: t("settings.account", { defaultValue: "Account" }),
      subtitle: t("settings.accountSubtitle", {
        defaultValue: "Email, password, delete account",
      }),
      onPress: () => router.push("/(app)/settings/account" as never),
    },
    {
      key: "sessions",
      icon: "users",
      title: t("settings.sessions", { defaultValue: "Active sessions" }),
      subtitle: t("settings.sessionsSubtitle", {
        defaultValue: "Devices signed into your account",
      }),
      onPress: () => router.push("/(app)/settings/sessions" as never),
    },
    {
      key: "notifications",
      icon: "bell",
      title: t("settings.notifications", { defaultValue: "Notifications" }),
      subtitle: t("settings.notificationsSubtitle", {
        defaultValue: "What we ping you about, and where",
      }),
      onPress: () => router.push("/(app)/settings/notifications" as never),
    },
    {
      key: "blocks",
      icon: "shield-off",
      title: t("settings.blocks", { defaultValue: "Blocked accounts" }),
      subtitle: t("settings.blocksSubtitle", {
        defaultValue: "People you've blocked",
      }),
      onPress: () => router.push("/(app)/settings/blocks" as never),
    },
  ];

  const emailHandle = email?.split("@")[0] ?? "me";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
      testID="settings-screen"
    >
      <ScrollView
        contentContainerStyle={{
          padding: nativeTokens.space[4],
          gap: nativeTokens.space[3],
        }}
      >
        <Surface variant="card" padding="4">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: nativeTokens.space[3],
            }}
          >
            <Avatar user={{ handle: emailHandle }} size="lg" />
            <View style={{ flex: 1, gap: nativeTokens.space[1] }}>
              <Text
                style={{
                  color: nativeTokens.color.ink,
                  fontSize: nativeTokens.type.scale.h3.size,
                  fontWeight: "700",
                  fontFamily: nativeTokens.type.family.sans,
                }}
              >
                {t("nav.me")}
              </Text>
              <Text
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontSize: nativeTokens.type.scale.small.size,
                  fontFamily: nativeTokens.type.family.sans,
                }}
              >
                {email ?? "…"}
              </Text>
              <Text
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontSize: nativeTokens.type.scale.small.size,
                  fontFamily: nativeTokens.type.family.sans,
                }}
              >
                {t("settings.profileSubtitle")}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: nativeTokens.space[3] }}>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => router.push("/(app)/me/edit" as never)}
              testID="settings-edit-profile"
            >
              {t("settings.editProfile")}
            </Button>
          </View>
        </Surface>

        {rows.map((row) => (
          <Pressable
            key={row.key}
            onPress={row.onPress}
            accessibilityRole="button"
            testID={`settings-row-${row.key}`}
          >
            <Surface variant="card" padding="4">
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: nativeTokens.space[3],
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: nativeTokens.radius.full,
                    backgroundColor: nativeTokens.color.brand50,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={row.icon} size={18} color={nativeTokens.color.brand700} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: nativeTokens.color.ink,
                      fontSize: nativeTokens.type.scale.body.size,
                      fontWeight: "600",
                      fontFamily: nativeTokens.type.family.sans,
                    }}
                  >
                    {row.title}
                  </Text>
                  <Text
                    style={{
                      color: nativeTokens.color.inkMuted,
                      fontSize: nativeTokens.type.scale.small.size,
                      fontFamily: nativeTokens.type.family.sans,
                    }}
                  >
                    {row.subtitle}
                  </Text>
                </View>
              </View>
            </Surface>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
