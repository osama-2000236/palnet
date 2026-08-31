import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

/** Which colour context the header is painted into. `band` is AppBand's olive. */
export type AppHeaderTone = "surface" | "band";

export interface AppHeaderProps extends Omit<ViewProps, "style"> {
  title: string;
  subtitle?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  search?: ReactNode;
  compact?: boolean;
  /** Default "surface" keeps every existing call site unchanged. */
  tone?: AppHeaderTone;
  style?: StyleProp<ViewStyle>;
}

export function AppHeader({
  title,
  subtitle,
  leading,
  trailing,
  search,
  compact = false,
  tone = "surface",
  style,
  ...rest
}: AppHeaderProps): JSX.Element {
  const c = useThemeTokens().color;
  const titleColor = tone === "band" ? c.bandOn : c.ink;
  const subtitleColor = tone === "band" ? c.bandOnMuted : c.inkMuted;
  return (
    <View style={[styles.wrap, compact ? styles.compact : null, style]} {...rest}>
      <View style={styles.topRow}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.textWrap}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.title, { color: titleColor }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={2} style={[styles.subtitle, { color: subtitleColor }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {search ? <View style={styles.search}>{search}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: nativeTokens.space[3],
    paddingBottom: nativeTokens.space[3],
  },
  compact: {
    paddingBottom: nativeTokens.space[2],
  },
  topRow: {
    minHeight: nativeTokens.chrome.minHit,
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  leading: {
    alignItems: "center",
    justifyContent: "center",
  },
  trailing: {
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h1.size,
    lineHeight: nativeTokens.type.scale.h1.line,
    fontWeight: "700",
    textAlign: "auto",
  },
  subtitle: {
    marginTop: nativeTokens.space[1],
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "auto",
  },
  search: {
    alignSelf: "stretch",
  },
});
