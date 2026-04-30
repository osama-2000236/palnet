import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Avatar, type AvatarUser } from "./Avatar";
import { Icon } from "./Icon";
import { Surface } from "./Surface";
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
        <View style={styles.prompt}>
          <Text numberOfLines={2} style={styles.placeholder}>
            {placeholder}
          </Text>
        </View>
        <View style={styles.iconWrap}>
          <Icon name="plus" size={18} color={nativeTokens.color.inkInverse} />
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
    textAlign: "right",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.accent600,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.9,
  },
});
