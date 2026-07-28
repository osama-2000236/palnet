import { Icon, Surface, nativeTokens, useThemeTokens, type IconName } from "@baydar/ui-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

const QUICK_LINKS: readonly { route: string; label: string; icon: IconName }[] = [
  { route: "/(app)/activity", label: "activity.title", icon: "clock" },
  { route: "/(app)/saved", label: "saved.title", icon: "bookmark" },
  { route: "/(app)/me/connections", label: "network.myConnections", icon: "users" },
  { route: "/(app)/me/karama", label: "karama.kicker", icon: "thumb" },
  { route: "/(app)/me/premium", label: "premium.entry", icon: "logo" },
  // One settings entry — the settings landing screen owns account, blocked,
  // appearance, privacy, security, and notification prefs.
  { route: "/(app)/settings", label: "settings.title", icon: "gear" },
];

// Compact icon rows in one flat surface (same row recipe as settings/index)
// instead of six identical full-width pill buttons.
export function ProfileQuickLinks(): JSX.Element {
  const { t } = useTranslation();
  const c = useThemeTokens().color;
  return (
    <Surface variant="flat" padding="0">
      <View>
        {QUICK_LINKS.map((item, i) => (
          <Pressable
            key={item.route}
            accessibilityRole="link"
            accessibilityLabel={t(item.label)}
            onPress={() => router.push(item.route as never)}
            style={({ pressed }) => ({
              minHeight: nativeTokens.chrome.minHit,
              paddingVertical: nativeTokens.space[3],
              paddingHorizontal: nativeTokens.space[4],
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: c.lineSoft,
              opacity: pressed ? 0.85 : 1,
              flexDirection: "row",
              alignItems: "center",
              gap: nativeTokens.space[3],
            })}
          >
            <Icon name={item.icon} size={20} color={c.brand700} />
            <Text
              style={{
                flex: 1,
                minWidth: 0,
                color: c.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.body.size,
                lineHeight: nativeTokens.type.scale.body.line,
                fontWeight: "600",
                textAlign: "auto",
              }}
            >
              {t(item.label)}
            </Text>
          </Pressable>
        ))}
      </View>
    </Surface>
  );
}
