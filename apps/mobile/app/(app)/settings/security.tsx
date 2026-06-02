import { Banner, Button, Chip, Surface, nativeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ROWS = ["password", "sessions", "twoFactor"] as const;

export default function SecuritySettingsScreen(): JSX.Element {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
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
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.h1.size,
              lineHeight: nativeTokens.type.scale.h1.line,
              fontWeight: "700",
              textAlign: "auto",
            }}
          >
            {t("settings.security.title")}
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
            {t("settings.security.subtitle")}
          </Text>
        </View>

        <Banner kind="warning">{t("settings.security.noticeBody")}</Banner>

        <Surface variant="card" padding="0">
          {ROWS.map((row, index) => (
            <View
              key={row}
              style={{
                padding: nativeTokens.space[4],
                gap: nativeTokens.space[3],
                borderTopWidth: index > 0 ? 1 : 0,
                borderTopColor: nativeTokens.color.lineSoft,
              }}
            >
              <View style={{ gap: nativeTokens.space[1] }}>
                <Text
                  style={{
                    color: nativeTokens.color.ink,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.body.size,
                    lineHeight: nativeTokens.type.scale.body.line,
                    fontWeight: "700",
                    textAlign: "auto",
                  }}
                >
                  {t(`settings.security.rows.${row}.title`)}
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
                  {t(`settings.security.rows.${row}.body`)}
                </Text>
              </View>
              <Chip selected={row === "password"}>{t(`settings.security.rows.${row}.state`)}</Chip>
            </View>
          ))}
        </Surface>

        <Text
          style={{
            color: nativeTokens.color.inkSubtle,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
            lineHeight: nativeTokens.type.scale.caption.line,
            textAlign: "auto",
          }}
        >
          {t("settings.security.disabledHint")}
        </Text>
        <Button fullWidth variant="secondary" disabled accessibilityLabel={t("common.save")}>
          {t("common.save")}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
