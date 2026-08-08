import { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Surface, nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";

import { useNetworkStore } from "@/store/network";

export function OfflineBanner(): JSX.Element | null {
  const styles = useStyles();
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
      <Text style={styles.title}>{t("connection.offline.title")}</Text>
      <Text style={styles.body}>{t("connection.offline.body")}</Text>
    </Surface>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    banner: {
      position: "absolute",
      start: nativeTokens.space[4],
      end: nativeTokens.space[4],
      // Above nav, below sheets and modals.
      zIndex: nativeTokens.z.dropdown,
      borderWidth: 1,
      borderColor: c.warning,
      backgroundColor: c.warningSoft,
    },
    title: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      fontWeight: "700",
    },
    body: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
    },
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
