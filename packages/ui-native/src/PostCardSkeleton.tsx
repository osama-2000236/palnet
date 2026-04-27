import { View } from "react-native";

import { Skeleton } from "./Skeleton";
import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";

export function PostCardSkeleton(): JSX.Element {
  return (
    <Surface
      variant="card"
      padding="0"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ overflow: "hidden" }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: nativeTokens.space[3],
          paddingHorizontal: nativeTokens.space[4],
          paddingTop: nativeTokens.space[4],
          paddingBottom: nativeTokens.space[2],
        }}
      >
        <Skeleton width={nativeTokens.space[10]} height={nativeTokens.space[10]} kind="circle" />
        <View style={{ flex: 1, gap: nativeTokens.space[1] }}>
          <Skeleton width="56%" height={nativeTokens.space[3]} />
          <Skeleton width="42%" height={nativeTokens.space[3]} />
          <Skeleton width="34%" height={nativeTokens.space[3]} />
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: nativeTokens.space[4],
          paddingBottom: nativeTokens.space[3],
          gap: nativeTokens.space[2],
        }}
      >
        <Skeleton width="92%" height={nativeTokens.space[3]} />
        <Skeleton width="78%" height={nativeTokens.space[3]} />
        <Skeleton width="60%" height={nativeTokens.space[3]} />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: nativeTokens.space[2],
          paddingHorizontal: nativeTokens.space[4],
          paddingVertical: nativeTokens.space[3],
        }}
      >
        <Skeleton width={nativeTokens.space[5]} height={nativeTokens.space[5]} kind="circle" />
        <Skeleton width={nativeTokens.space[8]} height={nativeTokens.space[3]} />
        <View style={{ flex: 1 }} />
        <Skeleton width="30%" height={nativeTokens.space[3]} />
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: nativeTokens.color.lineSoft,
          flexDirection: "row",
          gap: nativeTokens.space[1],
          padding: nativeTokens.space[1],
        }}
      >
        <Skeleton width="24%" height={nativeTokens.space[10]} radius={nativeTokens.radius.md} />
        <Skeleton width="24%" height={nativeTokens.space[10]} radius={nativeTokens.radius.md} />
        <Skeleton width="24%" height={nativeTokens.space[10]} radius={nativeTokens.radius.md} />
        <Skeleton width="24%" height={nativeTokens.space[10]} radius={nativeTokens.radius.md} />
      </View>
    </Surface>
  );
}
