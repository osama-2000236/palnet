import { nativeTokens } from "@baydar/ui-native";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export function FieldCover({ uri }: { uri?: string | null }): JSX.Element {
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

const styles = StyleSheet.create({
  cover: {
    height: nativeTokens.space[24],
    overflow: "hidden",
    backgroundColor: nativeTokens.color.brand100,
    borderBottomWidth: 1,
    borderBottomColor: nativeTokens.color.lineSoft,
  },
  strip: {
    position: "absolute",
    left: -nativeTokens.space[8],
    right: -nativeTokens.space[8],
    height: nativeTokens.space[6],
    borderRadius: nativeTokens.radius.full,
    transform: [{ rotate: "-8deg" }],
  },
  stripOne: {
    bottom: nativeTokens.space[2],
    backgroundColor: nativeTokens.color.surfaceSunken,
  },
  stripTwo: {
    bottom: nativeTokens.space[6],
    backgroundColor: nativeTokens.color.brand50,
  },
  stripThree: {
    bottom: nativeTokens.space[10],
    backgroundColor: nativeTokens.color.brand200,
    opacity: 0.7,
  },
  stripFour: {
    bottom: nativeTokens.space[16],
    backgroundColor: nativeTokens.color.surfaceSubtle,
    opacity: 0.9,
  },
  horizon: {
    position: "absolute",
    top: nativeTokens.space[4],
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: nativeTokens.color.lineSoft,
  },
});
