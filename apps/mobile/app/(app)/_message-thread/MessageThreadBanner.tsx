import { nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { Pressable, Text, View } from "react-native";

export function UnreadJumpBanner({
  count,
  label,
  accessibilityLabel,
  onPress,
}: {
  count: number;
  label: string;
  accessibilityLabel: string;
  onPress(): void;
}): JSX.Element | null {
  const c = useThemeTokens().color;
  if (count <= 0) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        alignSelf: "center",
        marginTop: nativeTokens.space[2],
        borderRadius: nativeTokens.radius.full,
        backgroundColor: c.brand100,
        paddingHorizontal: nativeTokens.space[3],
        paddingVertical: nativeTokens.space[1],
      }}
    >
      <Text
        style={{
          color: c.brand700,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.caption.size,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ThreadErrorBanner({ error }: { error: string | null }): JSX.Element | null {
  const c = useThemeTokens().color;
  if (!error) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        borderTopWidth: 1,
        borderTopColor: c.danger,
        backgroundColor: c.dangerSoft,
        paddingHorizontal: nativeTokens.space[4],
        paddingVertical: nativeTokens.space[2],
      }}
    >
      <Text
        style={{
          color: c.danger,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.small.size,
        }}
      >
        {error}
      </Text>
    </View>
  );
}
