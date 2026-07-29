import { RadioGroup, Surface, useThemeTokens } from "@baydar/ui-native";
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

  // Theme and language are settings, not filters or sub-routes, so they are
  // RadioGroups — DESIGN.md §6.3 scopes the tab strip to filters and sub-routes,
  // and web's twin screen already picks the theme with a RadioGroup.
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
            <RadioGroup
              items={options.map((option) => ({
                value: option.key,
                label: option.label,
                testID: `appearance-${option.key}`,
              }))}
              value={choice}
              onValueChange={(value) => setChoice(value as ThemeChoice)}
            />
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
            <RadioGroup
              items={[
                { value: "ar-PS", label: t("settings.language.arabic"), testID: "language-ar-PS" },
                { value: "en", label: t("settings.language.english"), testID: "language-en" },
              ]}
              value={locale}
              onValueChange={(value) => void setAppLocale(value as SupportedLocale)}
            />
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
