import { Button, Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function AppGateError({
  isConnected,
  onRetry,
}: {
  isConnected: boolean;
  onRetry(): void;
}): JSX.Element {
  const c = useThemeTokens().color;
  const { t } = useTranslation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surfaceMuted }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: nativeTokens.space[4],
        }}
      >
        <Surface variant="hero" padding="5" style={{ gap: nativeTokens.space[3] }}>
          <Text
            selectable
            style={{
              color: c.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.h1.size,
              fontWeight: "700",
              lineHeight: nativeTokens.type.scale.h1.line,
              textAlign: "auto",
            }}
          >
            {t("appGate.title")}
          </Text>
          <Text
            selectable
            style={{
              color: c.inkMuted,
              fontFamily: nativeTokens.type.family.body,
              fontSize: nativeTokens.type.scale.body.size,
              lineHeight: nativeTokens.type.scale.body.line,
              textAlign: "auto",
            }}
          >
            {isConnected ? t("appGate.body") : t("appGate.offlineBody")}
          </Text>
          <Button fullWidth size="lg" accessibilityLabel={t("common.retry")} onPress={onRetry}>
            {t("common.retry")}
          </Button>
        </Surface>
      </View>
    </SafeAreaView>
  );
}

// expo-router colocation: not a screen.
export default (): null => null;
