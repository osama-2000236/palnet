import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { nativeTokens } from "./tokens";

export interface AppHeaderProps extends Omit<ViewProps, "style"> {
  title: string;
  subtitle?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  search?: ReactNode;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppHeader({
  title,
  subtitle,
  leading,
  trailing,
  search,
  compact = false,
  style,
  ...rest
}: AppHeaderProps): JSX.Element {
  return (
    <View style={[styles.wrap, compact ? styles.compact : null, style]} {...rest}>
      <View style={styles.topRow}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.textWrap}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={2} style={styles.subtitle}>
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
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h1.size,
    lineHeight: nativeTokens.type.scale.h1.line,
    fontWeight: "700",
    textAlign: "right",
  },
  subtitle: {
    marginTop: nativeTokens.space[1],
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "right",
  },
  search: {
    alignSelf: "stretch",
  },
});
