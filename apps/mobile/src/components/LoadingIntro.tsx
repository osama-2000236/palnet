import { Icon, nativeTokens } from "@baydar/ui-native";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Text, View, type ViewStyle } from "react-native";

interface LoadingIntroProps {
  label?: string;
  caption?: string;
  compact?: boolean;
  showText?: boolean;
  testID?: string;
  style?: ViewStyle;
}

export function LoadingIntro({
  label,
  caption,
  compact = false,
  showText = true,
  testID,
  style,
}: LoadingIntroProps): JSX.Element {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulse]);

  const markMotion = useMemo(
    () => ({
      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
      transform: [
        { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) },
        { translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [2, -2] }) },
      ],
    }),
    [pulse],
  );

  const dotMotion = useMemo(
    () => ({
      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
      transform: [
        { translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [3, -1] }) },
      ],
    }),
    [pulse],
  );

  const markSize = compact ? nativeTokens.space[16] : nativeTokens.space[24];
  const iconSize = compact ? nativeTokens.space[8] : nativeTokens.space[12];

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: nativeTokens.space[4],
          backgroundColor: nativeTokens.color.surfaceMuted,
          padding: nativeTokens.space[6],
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: markSize,
            height: markSize,
            borderRadius: nativeTokens.radius.xl,
            borderWidth: 1,
            borderColor: nativeTokens.color.lineSoft,
            backgroundColor: nativeTokens.color.surface,
            alignItems: "center",
            justifyContent: "center",
            ...nativeTokens.shadow.card,
          },
          markMotion,
        ]}
      >
        <Icon name="logo" size={iconSize} color={nativeTokens.color.brand600} />
      </Animated.View>

      <View style={{ flexDirection: "row", gap: nativeTokens.space[2], alignItems: "center" }}>
        {[0, 1, 2].map((item) => (
          <Animated.View
            key={item}
            style={[
              {
                width: nativeTokens.space[2],
                height: nativeTokens.space[2],
                borderRadius: nativeTokens.radius.full,
                backgroundColor: item === 1 ? nativeTokens.color.accent600 : nativeTokens.color.brand600,
              },
              dotMotion,
            ]}
          />
        ))}
      </View>

      {showText ? (
        <View style={{ alignItems: "center", gap: nativeTokens.space[1] }}>
          {label ? (
            <Text
              selectable
              style={{
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontWeight: nativeTokens.type.scale.h1.weight,
                fontSize: nativeTokens.type.scale.h1.size,
                lineHeight: nativeTokens.type.scale.h1.line,
                textAlign: "center",
              }}
            >
              {label}
            </Text>
          ) : null}
          {caption ? (
            <Text
              selectable
              style={{
                color: nativeTokens.color.inkMuted,
                fontFamily: nativeTokens.type.family.body,
                fontSize: nativeTokens.type.scale.body.size,
                lineHeight: nativeTokens.type.scale.body.line,
                textAlign: "center",
              }}
            >
              {caption}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
