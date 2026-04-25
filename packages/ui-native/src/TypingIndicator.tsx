import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { nativeTokens } from "./tokens";

export interface TypingIndicatorProps {
  label: string;
}

export function TypingIndicator({ label }: TypingIndicatorProps): JSX.Element {
  return (
    <View accessibilityRole="text" accessibilityLabel={label} style={styles.root}>
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
      <Text style={styles.hidden}>{label}</Text>
    </View>
  );
}

function Dot({ delay }: { delay: number }): JSX.Element {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 250, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity]);
  return <Animated.View style={[styles.dot, { opacity }]} />;
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: nativeTokens.space[1],
    borderWidth: 1,
    borderColor: nativeTokens.color.lineSoft,
    borderRadius: 14,
    borderBottomStartRadius: 4,
    backgroundColor: nativeTokens.color.surface,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: nativeTokens.color.inkMuted,
  },
  hidden: {
    position: "absolute",
    opacity: 0,
  },
});
