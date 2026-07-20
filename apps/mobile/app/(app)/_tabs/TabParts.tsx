import { Icon, type IconName, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";

export const hiddenTabOptions = {
  href: null,
} as const;

export const hiddenFullScreenTabOptions = {
  ...hiddenTabOptions,
  tabBarStyle: { display: "none" },
} as const;

export function TabLabel({
  label,
  color,
  focused,
  raised = false,
}: {
  label: string;
  color: string;
  focused: boolean;
  raised?: boolean;
}): JSX.Element {
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.72}
      style={{
        width: nativeTokens.space[16],
        maxWidth: nativeTokens.space[16],
        color,
        fontFamily: nativeTokens.type.family.sans,
        fontSize: nativeTokens.type.scale.caption.size - nativeTokens.space[1] / 2,
        lineHeight: nativeTokens.type.scale.caption.line - nativeTokens.space[1],
        fontWeight: focused ? "800" : "700",
        textAlign: "center",
        includeFontPadding: false,
        marginTop: raised ? nativeTokens.space[1] : 0,
      }}
    >
      {label}
    </Text>
  );
}

export function TabButton({
  testID,
  ...props
}: BottomTabBarButtonProps & { testID: string }): JSX.Element {
  const { ref: _ref, ...pressableProps } = props as BottomTabBarButtonProps & { ref?: unknown };
  return <Pressable {...pressableProps} testID={testID} />;
}

export function TabIcon({
  name,
  color,
  focused,
}: {
  name: IconName;
  color: string;
  focused: boolean;
}): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <View
      style={{
        minWidth: nativeTokens.chrome.minHit,
        height: nativeTokens.space[6] + nativeTokens.space[1],
        borderRadius: nativeTokens.radius.full,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? c.brand50 : "transparent",
      }}
    >
      <Icon
        name={name}
        color={color}
        size={nativeTokens.space[5]}
        strokeWidth={focused ? 2.2 : 1.8}
      />
    </View>
  );
}
