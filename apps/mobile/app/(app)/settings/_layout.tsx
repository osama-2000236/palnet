import { Stack } from "expo-router";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Pressable } from "react-native";

import { Icon, nativeTokens } from "@palnet/ui-native";

import { logoutAction } from "@/lib/auth-actions";

export default function SettingsLayout(): JSX.Element {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: nativeTokens.color.surface },
        headerTintColor: nativeTokens.color.ink,
        headerTitleStyle: { fontFamily: nativeTokens.type.family.sans },
        headerBackButtonDisplayMode: "minimal",
        headerRight: () => <HeaderLogoutButton />,
      }}
    >
      <Stack.Screen name="index" options={{ title: t("settings.title") }} />
      <Stack.Screen
        name="account"
        options={{
          title: t("settings.account"),
        }}
      />
      <Stack.Screen
        name="sessions"
        options={{
          title: t("settings.sessions"),
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: t("settings.notifications"),
        }}
      />
      <Stack.Screen
        name="blocks"
        options={{
          title: t("settings.blocks"),
        }}
      />
      <Stack.Screen
        name="legal"
        options={{
          title: t("settings.legal"),
        }}
      />
    </Stack>
  );
}

function HeaderLogoutButton(): JSX.Element {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  function confirm(): void {
    if (busy) return;
    Alert.alert(t("settings.signOutConfirmTitle"), t("settings.signOutConfirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.logout"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await logoutAction();
          } finally {
            setBusy(false);
            router.replace("/(auth)/login");
          }
        },
      },
    ]);
  }

  return (
    <Pressable
      testID="settings-header-logout"
      accessibilityRole="button"
      accessibilityLabel={t("auth.logout")}
      hitSlop={8}
      onPress={confirm}
      style={{ minWidth: 32, alignItems: "center", justifyContent: "center" }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={nativeTokens.color.inkMuted} />
      ) : (
        <Icon name="log-out" size={18} color={nativeTokens.color.inkMuted} />
      )}
    </Pressable>
  );
}
