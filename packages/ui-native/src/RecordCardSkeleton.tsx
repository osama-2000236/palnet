import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Skeleton } from "./Skeleton";
import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";

export interface RecordCardSkeletonProps {
  variant?: "card" | "row";
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function RecordCardSkeleton({
  variant = "card",
  style,
  testID,
}: RecordCardSkeletonProps): JSX.Element {
  return (
    <Surface
      variant={variant}
      padding="4"
      style={[styles.surface, variant === "row" ? styles.rowSurface : null, style]}
      testID={testID}
    >
      <Skeleton width={nativeTokens.space[12]} height={nativeTokens.space[12]} kind="rect" />
      <View style={styles.copy}>
        <Skeleton width="70%" height={nativeTokens.space[4]} kind="pill" />
        <Skeleton width="48%" height={nativeTokens.space[3]} kind="pill" />
        <Skeleton width="86%" height={nativeTokens.space[3]} kind="pill" />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  rowSurface: {
    borderRadius: 0,
  },
  copy: {
    flex: 1,
    gap: nativeTokens.space[2],
  },
});
