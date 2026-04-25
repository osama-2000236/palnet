import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";

export function PostCardSkeleton(): JSX.Element {
  const opacity = usePulse();
  return (
    <Surface variant="card" padding="4" accessibilityRole="summary">
      <Animated.View style={[styles.stack, { opacity }]}>
        <View style={styles.header}>
          <View style={styles.avatar} />
          <View style={styles.lines}>
            <View style={styles.lineWide} />
            <View style={styles.lineShort} />
          </View>
        </View>
        <View style={styles.lineFull} />
        <View style={styles.lineWide} />
      </Animated.View>
    </Surface>
  );
}

function usePulse(): Animated.Value {
  const value = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value]);
  return value;
}

const styles = StyleSheet.create({
  stack: { gap: nativeTokens.space[3] },
  header: { flexDirection: "row", alignItems: "center", gap: nativeTokens.space[3] },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  lines: { flex: 1, gap: nativeTokens.space[2] },
  lineWide: {
    height: 12,
    borderRadius: 6,
    width: "70%",
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  lineShort: {
    height: 12,
    borderRadius: 6,
    width: "42%",
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  lineFull: {
    height: 12,
    borderRadius: 6,
    width: "100%",
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
});
