import { Banner, Button, Chip, Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ROWS = ["profile", "messages", "search"] as const;

export default function PrivacySettingsScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surfaceMuted }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: nativeTokens.space[4],
          gap: nativeTokens.space[4],
          paddingBottom: nativeTokens.space[10],
        }}
      >
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
            {t("settings.privacy.title")}
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
            {t("settings.privacy.subtitle")}
          </Text>
        </View>

        <Banner kind="warning">{t("settings.privacy.noticeBody")}</Banner>

        <Surface variant="card" padding="0">
          {ROWS.map((row, index) => (
            <View
              key={row}
              style={{
                padding: nativeTokens.space[4],
                gap: nativeTokens.space[3],
                borderTopWidth: index > 0 ? 1 : 0,
                borderTopColor: c.lineSoft,
              }}
            >
              <View style={{ gap: nativeTokens.space[1] }}>
                <Text
                  style={{
                    color: c.ink,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.body.size,
                    lineHeight: nativeTokens.type.scale.body.line,
                    fontWeight: "700",
                    textAlign: "auto",
                  }}
                >
                  {t(`settings.privacy.rows.${row}.title`)}
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
                  {t(`settings.privacy.rows.${row}.body`)}
                </Text>
              </View>
              <Chip selected>{t(`settings.privacy.rows.${row}.state`)}</Chip>
            </View>
          ))}
        </Surface>

        <Text
          style={{
            color: c.inkSubtle,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
            lineHeight: nativeTokens.type.scale.caption.line,
            textAlign: "auto",
          }}
        >
          {t("settings.privacy.disabledHint")}
        </Text>
        <Button fullWidth variant="secondary" disabled accessibilityLabel={t("common.save")}>
          {t("common.save")}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
