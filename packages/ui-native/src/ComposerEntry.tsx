import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Avatar, type AvatarUser } from "./Avatar";
import { Icon } from "./Icon";
import { Surface } from "./Surface";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface ComposerEntryProps {
  user?: AvatarUser | null;
  placeholder: string;
  actionLabel?: string;
  onPress: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function ComposerEntry({
  user,
  placeholder,
  actionLabel,
  onPress,
  testID,
  style,
}: ComposerEntryProps): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={actionLabel ?? placeholder}
      testID={testID}
      style={({ pressed }) => [pressed ? styles.pressed : null, style]}
    >
      <Surface variant="card" padding="3" style={styles.surface}>
        <Avatar user={user ?? null} size="md" />
        <View style={[styles.prompt, { borderColor: c.lineSoft, backgroundColor: c.surfaceMuted }]}>
          <Text numberOfLines={2} style={[styles.placeholder, { color: c.inkMuted }]}>
            {placeholder}
          </Text>
        </View>
        <View
          style={[styles.iconWrap, { borderColor: c.lineSoft, backgroundColor: c.surfaceMuted }]}
        >
          <Icon name="image" size={18} color={c.inkMuted} />
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  prompt: {
    flex: 1,
    minHeight: nativeTokens.chrome.minHit,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: nativeTokens.color.lineSoft,
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.surfaceMuted,
    paddingHorizontal: nativeTokens.space[3],
  },
  placeholder: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    textAlign: "auto",
  },
  iconWrap: {
    width: nativeTokens.chrome.minHit,
    height: nativeTokens.chrome.minHit,
    borderRadius: nativeTokens.radius.full,
    borderWidth: 1,
    borderColor: nativeTokens.color.lineSoft,
    backgroundColor: nativeTokens.color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.9,
  },
});
