import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { nativeTokens } from "./tokens";

export interface SegmentedControlItem<Key extends string = string> {
  key: Key;
  label: string;
  testID?: string;
  accessibilityLabel?: string;
}

export interface SegmentedControlProps<Key extends string = string> {
  items: Array<SegmentedControlItem<Key>>;
  selectedKey: Key;
  onChange: (key: Key) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SegmentedControl<Key extends string = string>({
  items,
  selectedKey,
  onChange,
  style,
  testID,
}: SegmentedControlProps<Key>): JSX.Element {
  return (
    <View accessibilityRole="tablist" testID={testID} style={[styles.wrap, style]}>
      {items.map((item) => {
        const selected = item.key === selectedKey;
        return (
          <Pressable
            key={item.key}
            testID={item.testID}
            accessibilityRole="tab"
            accessibilityLabel={item.accessibilityLabel ?? item.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => [
              styles.item,
              selected ? styles.itemSelected : styles.itemDefault,
              pressed ? styles.itemPressed : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, selected ? styles.labelSelected : styles.labelDefault]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
  },
  item: {
    minHeight: nativeTokens.chrome.minHit,
    minWidth: nativeTokens.space[20],
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: nativeTokens.radius.full,
    borderWidth: 1,
    paddingHorizontal: nativeTokens.space[3],
  },
  itemDefault: {
    borderColor: nativeTokens.color.lineHard,
    backgroundColor: nativeTokens.color.surface,
  },
  itemSelected: {
    borderColor: nativeTokens.color.brand600,
    backgroundColor: nativeTokens.color.brand600,
  },
  itemPressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
  },
  labelDefault: {
    color: nativeTokens.color.ink,
  },
  labelSelected: {
    color: nativeTokens.color.inkInverse,
  },
});
