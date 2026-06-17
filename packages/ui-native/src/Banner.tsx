// Banner — native twin of packages/ui-web/src/Banner.tsx.
//
// MVP API; design final spec owed (HANDOFF-TO-DESIGN-2026-05-16 §C.23).

import type { ReactElement, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type BannerKind = "info" | "warning" | "danger" | "success";

export interface BannerProps {
  kind: BannerKind;
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?(): void;
  dismissLabel?: string;
}

export function Banner({
  kind,
  children,
  dismissible,
  onDismiss,
  dismissLabel,
}: BannerProps): ReactElement {
  const c = useThemeTokens().color;
  const palette = {
    info: { bg: c.infoSoft, fg: c.info },
    warning: { bg: c.warningSoft, fg: c.warning },
    danger: { bg: c.dangerSoft, fg: c.danger },
    success: { bg: c.successSoft, fg: c.success },
  }[kind];
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion={kind === "danger" ? "assertive" : "polite"}
      style={{
        backgroundColor: palette.bg,
        paddingHorizontal: nativeTokens.space[4],
        paddingVertical: nativeTokens.space[2],
        flexDirection: "row",
        alignItems: "center",
        gap: nativeTokens.space[3],
      }}
    >
      <Text style={{ color: palette.fg, fontSize: 13, flex: 1 }}>{children}</Text>
      {dismissible && onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityLabel={dismissLabel ?? "إغلاق"}
          hitSlop={12}
          style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: c.inkMuted, fontSize: 16 }}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
