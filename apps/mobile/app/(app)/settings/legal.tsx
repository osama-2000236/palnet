import { Icon, Surface, nativeTokens } from "@palnet/ui-native";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

const WEB_BASE = (() => {
  const url = process.env.EXPO_PUBLIC_WEB_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new Error("EXPO_PUBLIC_WEB_URL missing");
    return "http://localhost:3000";
  }
  return url.replace(/\/$/, "");
})();

export default function LegalSettingsScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? "en" : "ar-PS";
  const rows = [
    { key: "terms", title: t("legal.terms"), href: `${WEB_BASE}/${locale}/terms` },
    { key: "privacy", title: t("legal.privacy"), href: `${WEB_BASE}/${locale}/privacy` },
    {
      key: "community",
      title: t("legal.community"),
      href: `${WEB_BASE}/${locale}/community-guidelines`,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <ScrollView
        contentContainerStyle={{ padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}
      >
        <Surface variant="hero" padding="5">
          <Text
            style={{
              color: nativeTokens.color.ink,
              fontSize: nativeTokens.type.scale.h2.size,
              fontWeight: "700",
              fontFamily: nativeTokens.type.family.sans,
            }}
          >
            {t("legal.title")}
          </Text>
        </Surface>

        {rows.map((row) => (
          <Pressable
            key={row.key}
            accessibilityRole="link"
            accessibilityLabel={row.title}
            onPress={() => {
              void WebBrowser.openBrowserAsync(row.href);
            }}
            testID={`legal-row-${row.key}`}
          >
            <Surface variant="card" padding="4">
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: nativeTokens.space[3],
                }}
              >
                <Icon name="settings" size={18} color={nativeTokens.color.brand700} />
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
              </View>
            </Surface>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
