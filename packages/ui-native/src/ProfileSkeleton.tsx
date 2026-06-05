// ProfileSkeleton — loading placeholder for profile screens.
// Used while profile data is fetching.
// Web twin: packages/ui-web/src/ProfileSkeleton.tsx.
//
// Shapes only — no strings, no icons. Tokens (surface-subtle + line-soft) only.

import type { ReactElement } from "react";
import { View } from "react-native";

import { nativeTokens } from "./tokens";

export type ProfileSkeletonProps = Record<string, never>;

export function ProfileSkeleton(_: ProfileSkeletonProps): ReactElement {
  const c = nativeTokens.color;
  const s = nativeTokens.space;
  return (
    <View
      style={{
        backgroundColor: c.surface,
        overflow: "hidden",
      }}
      accessible={false}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          paddingHorizontal: s[6],
          paddingVertical: s[5],
        }}
      >
        <View
          style={{
            width: s[12],
            height: s[12],
            backgroundColor: c.surfaceSubtle,
            borderRadius: 9999,
          }}
        />
        <View
          style={{
            flex: 1,
            marginLeft: s[4],
          }}
        >
          <View
            style={{
              height: s[4],
              width: s[9],
              backgroundColor: c.surfaceSubtle,
              borderRadius: s[2],
              marginBottom: s[2],
            }}
          />
          <View
            style={{
              height: s[3],
              width: s[7],
              backgroundColor: c.surfaceSubtle,
              borderRadius: s[2],
              marginBottom: s[2],
            }}
          />
          <View
            style={{
              height: s[3],
              width: s[5],
              backgroundColor: c.surfaceSubtle,
              borderRadius: s[2],
            }}
          />
        </View>
      </View>

      {/* Bio */}
      <View
        style={{
          paddingHorizontal: s[6],
          paddingVertical: s[4],
        }}
      >
        <View
          style={{
            height: s[3],
            width: "80%",
            backgroundColor: c.surfaceSubtle,
            borderRadius: s[2],
            marginBottom: s[2],
          }}
        />
        <View
          style={{
            height: s[3],
            width: "60%",
            backgroundColor: c.surfaceSubtle,
            borderRadius: s[2],
            marginBottom: s[2],
          }}
        />
        <View
          style={{
            height: s[3],
            width: "40%",
            backgroundColor: c.surfaceSubtle,
            borderRadius: s[2],
          }}
        />
      </View>

      {/* Stats */}
      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.lineSoft,
          paddingHorizontal: s[6],
          paddingVertical: s[3],
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: s[9],
              height: s[9],
              backgroundColor: c.surfaceSubtle,
              borderRadius: 9999,
              marginRight: s[3],
            }}
          />
          <View
            style={{
              height: s[3],
              width: s[5],
              backgroundColor: c.surfaceSubtle,
              borderRadius: s[2],
            }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              height: s[3],
              width: s[5],
              backgroundColor: c.surfaceSubtle,
              borderRadius: s[2],
              marginRight: s[3],
            }}
          />
          <View
            style={{
              height: s[3],
              width: s[6],
              backgroundColor: c.surfaceSubtle,
              borderRadius: s[2],
            }}
          />
        </View>
        <View style={{ flex: 1 }} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: s[9],
              height: s[9],
              backgroundColor: c.surfaceSubtle,
              borderRadius: 9999,
              marginRight: s[3],
            }}
          />
          <View
            style={{
              height: s[3],
              width: s[5],
              backgroundColor: c.surfaceSubtle,
              borderRadius: s[2],
            }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: s[9],
              height: s[9],
              backgroundColor: c.surfaceSubtle,
              borderRadius: 9999,
              marginRight: s[3],
            }}
          />
          <View
            style={{
              height: s[3],
              width: s[6],
              backgroundColor: c.surfaceSubtle,
              borderRadius: s[2],
            }}
          />
        </View>
      </View>

      {/* Tabs */}
      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.lineSoft,
          paddingHorizontal: s[6],
          paddingVertical: s[3],
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: s[10],
            height: s[10],
            backgroundColor: c.surfaceSubtle,
            borderRadius: 9999,
            marginRight: s[3],
          }}
        />
        <View
          style={{
            height: s[3],
            width: s[7],
            backgroundColor: c.surfaceSubtle,
            borderRadius: s[2],
          }}
        />
        <View
          style={{
            height: s[3],
            width: s[7],
            backgroundColor: c.surfaceSubtle,
            borderRadius: s[2],
          }}
        />
        <View
          style={{
            height: s[3],
            width: s[7],
            backgroundColor: c.surfaceSubtle,
            borderRadius: s[2],
          }}
        />
      </View>
    </View>
  );
}
