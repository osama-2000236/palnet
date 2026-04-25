import { PostCardSkeleton } from "./PostCardSkeleton";
import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";
import { Animated, StyleSheet, View } from "react-native";
import { useEffect, useRef } from "react";

export function ProfilePageSkeleton(): JSX.Element {
  const opacity = usePulse();
  return (
    <View style={styles.stack}>
      <Surface variant="hero" padding="6">
        <Animated.View style={[styles.hero, { opacity }]}>
          <View style={styles.cover} />
          <View style={styles.avatar} />
          <View style={styles.lineWide} />
          <View style={styles.lineShort} />
        </Animated.View>
      </Surface>
      <PostCardSkeleton />
    </View>
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
  stack: { gap: nativeTokens.space[4] },
  hero: { gap: nativeTokens.space[3] },
  cover: { height: 96, borderRadius: nativeTokens.radius.md, backgroundColor: nativeTokens.color.surfaceSubtle },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: nativeTokens.color.surfaceSubtle },
  lineWide: { height: 14, width: "65%", borderRadius: 7, backgroundColor: nativeTokens.color.surfaceSubtle },
  lineShort: { height: 14, width: "40%", borderRadius: 7, backgroundColor: nativeTokens.color.surfaceSubtle },
});
