import { Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Item {
  href: string;
  label: string;
  desc: string;
}

export default function SettingsLandingScreen(): JSX.Element {
  const { t } = useTranslation();
  const items: Item[] = [
    {
      href: "/settings/account",
      label: t("settings.items.account"),
      desc: t("settings.items.accountDesc"),
    },
    {
      href: "/settings/blocked",
      label: t("settings.items.blocked"),
      desc: t("settings.items.blockedDesc"),
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <View style={{ flex: 1, padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}>
        <View style={{ gap: nativeTokens.space[1] }}>
          <Text
            accessibilityRole="header"
            style={{
              color: nativeTokens.color.ink,
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
              color: nativeTokens.color.inkMuted,
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
                  borderTopColor: nativeTokens.color.lineSoft,
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
                      color: nativeTokens.color.ink,
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
                      color: nativeTokens.color.inkMuted,
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
                <Text
                  accessibilityElementsHidden
                  style={{
                    color: nativeTokens.color.inkSubtle,
                    fontSize: nativeTokens.type.scale.body.size,
                    transform: [{ scaleX: -1 }],
                  }}
                >
                  ›
                </Text>
              </Pressable>
            ))}
          </View>
        </Surface>
      </View>
    </SafeAreaView>
  );
}
