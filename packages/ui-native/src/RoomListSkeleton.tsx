// RoomListSkeleton — loading placeholder for messages/chats list.
// Used while the list of rooms is fetching.
// Web twin: packages/ui-web/src/RoomListSkeleton.tsx.
//
// Shapes only — no strings, no icons. Tokens (surface-subtle + line-soft) only.

export type RoomListSkeletonProps = Record<string, never>;

import type { ReactElement } from "react";
import { View } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export function RoomListSkeleton(_: RoomListSkeletonProps): ReactElement {
  const c = useThemeTokens().color;
  const s = nativeTokens.space;
  return (
    <View
      style={{
        backgroundColor: c.surface,
        overflow: "hidden",
      }}
      accessible={false}
    >
      {/* List of 3 rows */}
      <View
        style={{
          gap: s[3],
          paddingHorizontal: s[4],
          paddingVertical: s[3],
        }}
      >
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View
              style={{
                width: s[2],
                height: s[2],
                backgroundColor: c.surfaceSubtle,
                borderRadius: 9999,
                marginRight: s[2],
              }}
            />
            <View
              style={{
                flex: 1,
                marginLeft: s[2],
              }}
            >
              <View
                style={{
                  height: s[1],
                  width: s[8],
                  backgroundColor: c.surfaceSubtle,
                  borderRadius: s[2],
                  marginBottom: s[1],
                }}
              />
              <View
                style={{
                  height: s[1],
                  width: s[7],
                  backgroundColor: c.surfaceSubtle,
                  borderRadius: s[2],
                  marginBottom: s[1],
                }}
              />
              <View
                style={{
                  height: s[1],
                  width: s[5],
                  backgroundColor: c.surfaceSubtle,
                  borderRadius: s[2],
                }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
