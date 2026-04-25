import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";

export function CompanyPageSkeleton(): JSX.Element {
  const opacity = usePulse();
  return (
    <Surface variant="hero" padding="6">
      <Animated.View style={[styles.stack, { opacity }]}>
        <View style={styles.cover} />
        <View style={styles.logo} />
        <View style={styles.lineWide} />
        <View style={styles.lineShort} />
        <View style={styles.lineFull} />
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
  cover: {
    height: 96,
    borderRadius: nativeTokens.radius.md,
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: nativeTokens.radius.md,
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  lineWide: {
    height: 14,
    width: "70%",
    borderRadius: 7,
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  lineShort: {
    height: 14,
    width: "45%",
    borderRadius: 7,
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
  lineFull: {
    height: 12,
    width: "100%",
    borderRadius: 6,
    backgroundColor: nativeTokens.color.surfaceSubtle,
  },
});
