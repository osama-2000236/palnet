import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
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
  const c = useThemeTokens().color;
  const itemDefault = { borderColor: c.lineHard, backgroundColor: c.surface };
  const itemSelected = { borderColor: c.brand600, backgroundColor: c.brand600 };
  const labelDefault = { color: c.ink };
  const labelSelected = { color: c.inkInverse };
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
              selected ? itemSelected : itemDefault,
              pressed ? styles.itemPressed : null,
            ]}
          >
            <Text numberOfLines={1} style={[styles.label, selected ? labelSelected : labelDefault]}>
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
    gap: nativeTokens.space[2],
  },
  item: {
    minHeight: nativeTokens.chrome.minHit,
    minWidth: 0,
    flexBasis: 0,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: nativeTokens.radius.full,
    borderWidth: 1,
    paddingHorizontal: nativeTokens.space[3],
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
});
