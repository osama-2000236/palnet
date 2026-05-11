// EmptyState — native twin of packages/ui-web/src/EmptyState.tsx.
//
// Same composition: illustration + title + description + recoverable action.
// Differs from StateMessage by emphasising a richer illustration slot (vs an
// icon glyph) and a centered, comfortable layout. StateMessage stays the
// primitive for offline/error banners.

import type { JSX, ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Button, type ButtonVariant } from "./Button";
import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
}

export interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  density?: "comfortable" | "compact";
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  action,
  density = "comfortable",
  style,
  testID,
}: EmptyStateProps): JSX.Element {
  return (
    <Surface
      variant="tinted"
      padding={density === "comfortable" ? "8" : "5"}
      accessibilityRole="text"
      style={[styles.wrap, style]}
      testID={testID}
    >
      {illustration ? (
        <View accessibilityElementsHidden style={styles.illustration}>
          {illustration}
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text selectable style={styles.title}>
          {title}
        </Text>
        {description ? (
          <Text selectable style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>
      {action ? (
        <View style={styles.action}>
          <Button
            variant={action.variant ?? "primary"}
            size="md"
            loading={action.loading}
            disabled={action.loading}
            onPress={action.onPress}
            accessibilityLabel={action.label}
          >
            {action.label}
          </Button>
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  illustration: {
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
  description: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    textAlign: "center",
  },
  action: {
    alignItems: "center",
    marginTop: nativeTokens.space[1],
  },
});
