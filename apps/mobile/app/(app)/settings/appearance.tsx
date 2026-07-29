import { Surface, Tab, Tabs, useThemeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setAppLocale } from "@/i18n";
import { needsRestartForDirection, normalizeLocale, type SupportedLocale } from "@/lib/locale";
import { type ThemeChoice } from "@/lib/theme";
import { useThemeStore } from "@/store/theme";

export default function AppearanceSettingsScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const tk = useThemeTokens();
  const choice = useThemeStore((state) => state.choice);
  const setChoice = useThemeStore((state) => state.setChoice);
  const locale = normalizeLocale(i18n.language);

  const options: { key: ThemeChoice; label: string; desc: string }[] = [
    {
      key: "light",
      label: t("settings.appearance.light"),
      desc: t("settings.appearance.lightDesc"),
    },
    { key: "dark", label: t("settings.appearance.dark"), desc: t("settings.appearance.darkDesc") },
    {
      key: "system",
      label: t("settings.appearance.system"),
      desc: t("settings.appearance.systemDesc"),
    },
  ];
  const activeDesc = options.find((option) => option.key === choice)?.desc ?? "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tk.color.surfaceMuted }}>
      <View style={{ flex: 1, padding: tk.space[4], gap: tk.space[3] }}>
        <View style={{ gap: tk.space[1] }}>
          <Text
            accessibilityRole="header"
            style={{
              color: tk.color.ink,
              fontFamily: tk.type.family.sans,
              fontSize: tk.type.scale.h1.size,
              lineHeight: tk.type.scale.h1.line,
              fontWeight: "700",
              textAlign: "auto",
            }}
          >
            {t("settings.appearance.title")}
          </Text>
          <Text
            style={{
              color: tk.color.inkMuted,
              fontFamily: tk.type.family.body,
              fontSize: tk.type.scale.small.size,
              lineHeight: tk.type.scale.small.line,
              textAlign: "auto",
            }}
          >
            {t("settings.appearance.subtitle")}
          </Text>
        </View>

        <Surface variant="card" padding="4">
          <View style={{ gap: tk.space[3] }}>
            <Tabs
              value={choice}
              onChange={(key) => setChoice(key as ThemeChoice)}
              testID="appearance-segmented"
            >
              {options.map((option) => (
                <Tab
                  key={option.key}
                  value={option.key}
                  // Locale-independent handle for E2E — the labels are translated,
                  // so tapping by text can't drive the locale switch itself.
                  testID={`appearance-${option.key}`}
                >
                  {option.label}
                </Tab>
              ))}
            </Tabs>
            <Text
              style={{
                color: tk.color.inkMuted,
                fontFamily: tk.type.family.body,
                fontSize: tk.type.scale.small.size,
                lineHeight: tk.type.scale.small.line,
                textAlign: "auto",
              }}
            >
              {activeDesc}
            </Text>
            <Text
              style={{
                color: tk.color.inkSubtle,
                fontFamily: tk.type.family.body,
                fontSize: tk.type.scale.caption.size,
                lineHeight: tk.type.scale.caption.line,
                textAlign: "auto",
              }}
            >
              {t("settings.appearance.hint")}
            </Text>
          </View>
        </Surface>

        <View style={{ gap: tk.space[1] }}>
          <Text
            accessibilityRole="header"
            style={{
              color: tk.color.ink,
              fontFamily: tk.type.family.sans,
              fontSize: tk.type.scale.h2.size,
              lineHeight: tk.type.scale.h2.line,
              fontWeight: "700",
              textAlign: "auto",
            }}
          >
            {t("settings.language.title")}
          </Text>
          <Text
            style={{
              color: tk.color.inkMuted,
              fontFamily: tk.type.family.body,
              fontSize: tk.type.scale.small.size,
              lineHeight: tk.type.scale.small.line,
              textAlign: "auto",
            }}
          >
            {t("settings.language.subtitle")}
          </Text>
        </View>

        <Surface variant="card" padding="4">
          <View style={{ gap: tk.space[3] }}>
            <Tabs
              value={locale}
              onChange={(key) => void setAppLocale(key as SupportedLocale)}
              testID="language-segmented"
            >
              <Tab value="ar-PS" testID="language-ar-PS">
                {t("settings.language.arabic")}
              </Tab>
              <Tab value="en" testID="language-en">
                {t("settings.language.english")}
              </Tab>
            </Tabs>
            {needsRestartForDirection(locale) ? (
              <Text
                style={{
                  color: tk.color.inkSubtle,
                  fontFamily: tk.type.family.body,
                  fontSize: tk.type.scale.caption.size,
                  lineHeight: tk.type.scale.caption.line,
                  textAlign: "auto",
                }}
              >
                {t("settings.language.restartHint")}
              </Text>
            ) : null}
          </View>
        </Surface>
      </View>
    </SafeAreaView>
  );
}
