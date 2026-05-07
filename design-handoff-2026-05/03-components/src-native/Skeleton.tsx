import { useEffect, useRef } from "react";
import { Animated, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";

import { nativeTokens } from "./tokens";

export interface SkeletonProps {
  width: DimensionValue;
  height: DimensionValue;
  radius?: number;
  kind?: "rect" | "circle" | "pill";
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width,
  height,
  radius,
  kind = "rect",
  style,
}: SkeletonProps): JSX.Element {
  const opacity = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.82,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.42,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const computedRadius =
    radius ??
    (kind === "circle" || kind === "pill" ? nativeTokens.radius.full : nativeTokens.radius.sm);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: computedRadius,
          backgroundColor: nativeTokens.color.surfaceSubtle,
          opacity,
        },
        style,
      ]}
    />
  );
}
