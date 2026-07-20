import { useMemo } from "react";
import { nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export function FieldCover({ uri }: { uri?: string | null }): JSX.Element {
  const styles = useStyles();
  if (uri) {
    return (
      <View style={styles.cover}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>
    );
  }

  return (
    <View style={styles.cover}>
      <View style={[styles.strip, styles.stripOne]} />
      <View style={[styles.strip, styles.stripTwo]} />
      <View style={[styles.strip, styles.stripThree]} />
      <View style={[styles.strip, styles.stripFour]} />
      <View style={styles.horizon} />
    </View>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    cover: {
      height: nativeTokens.space[24],
      overflow: "hidden",
      backgroundColor: c.brand100,
      borderBottomWidth: 1,
      borderBottomColor: c.lineSoft,
    },
    strip: {
      position: "absolute",
      start: -nativeTokens.space[8],
      end: -nativeTokens.space[8],
      height: nativeTokens.space[6],
      borderRadius: nativeTokens.radius.full,
      transform: [{ rotate: "-8deg" }],
    },
    stripOne: {
      bottom: nativeTokens.space[2],
      backgroundColor: c.surfaceSunken,
    },
    stripTwo: {
      bottom: nativeTokens.space[6],
      backgroundColor: c.brand50,
    },
    stripThree: {
      bottom: nativeTokens.space[10],
      backgroundColor: c.brand200,
      opacity: 0.7,
    },
    stripFour: {
      bottom: nativeTokens.space[16],
      backgroundColor: c.surfaceSubtle,
      opacity: 0.9,
    },
    horizon: {
      position: "absolute",
      top: nativeTokens.space[4],
      start: 0,
      end: 0,
      height: 1,
      backgroundColor: c.lineSoft,
    },
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
