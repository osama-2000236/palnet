import { Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SettingsHref =
  | "/settings/account"
  | "/settings/notifications"
  | "/settings/appearance"
  | "/settings/privacy"
  | "/settings/security"
  | "/settings/blocked";

interface Item {
  href: SettingsHref;
  label: string;
  desc: string;
}

export default function SettingsLandingScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();
  const items: Item[] = [
    {
      href: "/settings/account",
      label: t("settings.items.account"),
      desc: t("settings.items.accountDesc"),
    },
    {
      href: "/settings/notifications",
      label: t("settings.items.notifications"),
      desc: t("settings.items.notificationsDesc"),
    },
    {
      href: "/settings/appearance",
      label: t("settings.items.appearance"),
      desc: t("settings.items.appearanceDesc"),
    },
    {
      href: "/settings/privacy",
      label: t("settings.items.privacy"),
      desc: t("settings.items.privacyDesc"),
    },
    {
      href: "/settings/security",
      label: t("settings.items.security"),
      desc: t("settings.items.securityDesc"),
    },
    {
      href: "/settings/blocked",
      label: t("settings.items.blocked"),
      desc: t("settings.items.blockedDesc"),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surfaceMuted }}>
      <View style={{ flex: 1, padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}>
        <View style={{ gap: nativeTokens.space[1] }}>
          <Text
            accessibilityRole="header"
            style={{
              color: c.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.h1.size,
              lineHeight: nativeTokens.type.scale.h1.line,
              fontWeight: "700",
              textAlign: "auto",
            }}
          >
            {t("settings.title")}
          </Text>
          <Text
            style={{
              color: c.inkMuted,
              fontFamily: nativeTokens.type.family.body,
              fontSize: nativeTokens.type.scale.small.size,
              lineHeight: nativeTokens.type.scale.small.line,
              textAlign: "auto",
            }}
          >
            {t("settings.subtitle")}
          </Text>
        </View>

        <Surface variant="flat" padding="0">
          <View>
            {items.map((item, i) => (
              <Pressable
                key={item.href}
                accessibilityRole="link"
                accessibilityLabel={item.label}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => ({
                  paddingVertical: nativeTokens.space[4],
                  paddingHorizontal: nativeTokens.space[4],
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: c.lineSoft,
                  opacity: pressed ? 0.85 : 1,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: nativeTokens.space[3],
                })}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      color: c.ink,
                      fontFamily: nativeTokens.type.family.sans,
                      fontSize: nativeTokens.type.scale.body.size,
                      lineHeight: nativeTokens.type.scale.body.line,
                      fontWeight: "600",
                      textAlign: "auto",
                    }}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={{
                      color: c.inkMuted,
                      fontFamily: nativeTokens.type.family.body,
                      fontSize: nativeTokens.type.scale.small.size,
                      lineHeight: nativeTokens.type.scale.small.line,
                      marginTop: 2,
                      textAlign: "auto",
                    }}
                  >
                    {item.desc}
                  </Text>
                </View>
                {/* No chevron: the row is already a labelled link, and a bare
                    glyph can't be mirrored reliably across RTL launches. */}
              </Pressable>
            ))}
          </View>
        </Surface>
      </View>
    </SafeAreaView>
  );
}
