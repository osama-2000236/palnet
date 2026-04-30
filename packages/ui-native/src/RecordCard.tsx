import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";

export interface RecordCardProps {
  leading?: ReactNode;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  trailing?: ReactNode;
  children?: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function RecordCard({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  children,
  onPress,
  accessibilityLabel,
  testID,
  style,
}: RecordCardProps): JSX.Element {
  const content = (
    <Surface variant="card" padding="4" style={[styles.surface, style]}>
      <View style={styles.row}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.textWrap}>
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={2} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
          {meta ? (
            <Text numberOfLines={1} style={styles.meta}>
              {meta}
            </Text>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {children ? <View style={styles.children}>{children}</View> : null}
    </Surface>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? title}
      testID={testID}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    gap: nativeTokens.space[3],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  leading: {
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
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
    textAlign: "right",
  },
  subtitle: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "right",
  },
  meta: {
    marginTop: nativeTokens.space[1],
    color: nativeTokens.color.inkSubtle,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
    textAlign: "right",
  },
  trailing: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  children: {
    gap: nativeTokens.space[2],
  },
  pressed: {
    opacity: 0.9,
  },
});
