import { StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Surface, nativeTokens } from "@baydar/ui-native";

import { useNetworkStore } from "@/store/network";

export function OfflineBanner(): JSX.Element | null {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isConnected = useNetworkStore((state) => state.isConnected);

  if (isConnected) return null;

  return (
    <Surface
      variant="tinted"
      padding="3"
      accessibilityRole="alert"
      style={[styles.banner, { top: insets.top + nativeTokens.space[2] }]}
    >
      <Text style={styles.title}>{t("system.offline.title")}</Text>
      <Text style={styles.body}>{t("system.offline.body")}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    start: nativeTokens.space[4],
    end: nativeTokens.space[4],
    zIndex: 50,
    borderWidth: 1,
    borderColor: nativeTokens.color.warning,
    backgroundColor: nativeTokens.color.warningSoft,
  },
  title: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    fontWeight: "700",
  },
  body: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
  },
});
