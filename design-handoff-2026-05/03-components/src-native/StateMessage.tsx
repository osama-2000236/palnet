import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";

export interface StateMessageProps {
  title?: string;
  message: string;
  actionLabel?: string;
  busy?: boolean;
  onAction?: () => void;
  role?: "alert" | "text";
  tone?: "neutral" | "error" | "offline" | "success";
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function StateMessage({
  title,
  message,
  actionLabel,
  busy = false,
  onAction,
  role = "alert",
  tone = "neutral",
  icon,
  style,
  testID,
}: StateMessageProps): JSX.Element {
  const colors = toneColors[tone];
  return (
    <Surface
      variant="tinted"
      padding="5"
      accessibilityRole={role}
      style={[styles.wrap, { backgroundColor: colors.background }, style]}
      testID={testID}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: colors.iconBackground }]}>
          <Icon name={icon} size={20} color={colors.icon} />
        </View>
      ) : null}
      <View style={styles.copy}>
        {title ? (
          <Text selectable style={styles.title}>
            {title}
          </Text>
        ) : null}
        <Text selectable style={styles.message}>
          {message}
        </Text>
      </View>
      {onAction && actionLabel ? (
        <View style={styles.action}>
          <Button
            variant={tone === "error" ? "secondary" : "primary"}
            size="sm"
            loading={busy}
            disabled={busy}
            onPress={onAction}
            accessibilityLabel={actionLabel}
          >
            {actionLabel}
          </Button>
        </View>
      ) : null}
    </Surface>
  );
}

const toneColors = {
  neutral: {
    background: nativeTokens.color.surfaceSubtle,
    iconBackground: nativeTokens.color.brand100,
    icon: nativeTokens.color.brand700,
  },
  error: {
    background: nativeTokens.color.dangerSoft,
    iconBackground: nativeTokens.color.surface,
    icon: nativeTokens.color.danger,
  },
  offline: {
    background: nativeTokens.color.warningSoft,
    iconBackground: nativeTokens.color.surface,
    icon: nativeTokens.color.warning,
  },
  success: {
    background: nativeTokens.color.successSoft,
    iconBackground: nativeTokens.color.surface,
    icon: nativeTokens.color.success,
  },
} as const;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  iconWrap: {
    width: nativeTokens.space[10],
    height: nativeTokens.space[10],
    borderRadius: nativeTokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    alignSelf: "stretch",
    gap: nativeTokens.space[1],
  },
  title: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    textAlign: "center",
  },
  action: {
    alignItems: "center",
  },
});
