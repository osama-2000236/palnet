// EmptyState — native twin of packages/ui-web/src/EmptyState.tsx.
// Same prop API (motif/direction/tint/size/title/body/cta/altCta/variant/align).
// Uses Pressable for the press feedback per nativeTokens conventions.

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Button } from "./Button";
import {
  Illustration,
  type IllustrationDirection,
  type IllustrationMotif,
  type IllustrationSize,
  type IllustrationTint,
} from "./Illustration";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface EmptyStateProps {
  motif: IllustrationMotif;
  direction?: IllustrationDirection;
  tint?: IllustrationTint;
  size?: IllustrationSize;
  title: string;
  body?: string;
  cta?: string;
  onAction?: () => void;
  altCta?: string;
  onAltAction?: () => void;
  variant?: "standalone" | "inline";
  align?: "center" | "start";
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function EmptyState({
  motif,
  direction = "harvest",
  tint = "sand",
  size,
  title,
  body,
  cta,
  onAction,
  altCta,
  onAltAction,
  variant = "standalone",
  align = "center",
  style,
  testID,
}: EmptyStateProps): JSX.Element {
  const inline = variant === "inline";
  const resolvedSize: IllustrationSize = size ?? (inline ? "sm" : "md");
  const tk = useThemeTokens();
  return (
    <View
      accessibilityRole="text"
      style={[
        styles.wrap,
        {
          alignItems: align === "start" ? "flex-start" : "center",
          gap: inline ? nativeTokens.space[3] : nativeTokens.space[4],
          paddingHorizontal: inline ? nativeTokens.space[4] : nativeTokens.space[6],
          paddingVertical: inline ? nativeTokens.space[5] : nativeTokens.space[8],
        },
        style,
      ]}
      testID={testID}
    >
      <Illustration motif={motif} direction={direction} tint={tint} size={resolvedSize} />
      <View
        style={{
          gap: inline ? nativeTokens.space[1] : nativeTokens.space[2],
          alignSelf: "stretch",
        }}
      >
        <Text
          style={[
            styles.title,
            {
              color: tk.color.ink,
              textAlign: align === "start" ? "left" : "center",
              fontSize: inline ? 16 : 19,
            },
          ]}
        >
          {title}
        </Text>
        {body ? (
          <Text
            style={[
              styles.body,
              {
                color: tk.color.inkMuted,
                textAlign: align === "start" ? "left" : "center",
                fontSize: inline ? 13 : 15,
              },
            ]}
          >
            {body}
          </Text>
        ) : null}
      </View>
      {cta || altCta ? (
        <View
          style={{
            gap: nativeTokens.space[1],
            alignItems: "center",
            marginTop: inline ? 0 : nativeTokens.space[1],
          }}
        >
          {cta ? (
            <Button variant="primary" size={inline ? "sm" : "md"} onPress={onAction}>
              {cta}
            </Button>
          ) : null}
          {altCta ? (
            <Button variant="ghost" size="sm" onPress={onAltAction}>
              {altCta}
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
  },
  title: {
    fontFamily: nativeTokens.type.family.sans,
    fontWeight: "600",
    lineHeight: 24,
  },
  body: {
    fontFamily: nativeTokens.type.family.body,
    lineHeight: 22,
    maxWidth: 360,
  },
});
