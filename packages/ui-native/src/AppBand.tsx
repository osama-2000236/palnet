// The olive band every screen sits under. NOT a new header — AppBand is the
// band (background, safe-area inset, inverse colour context) and it renders
// AppHeader inside it, so AppHeader keeps its API and its snapshots.
//
// Separated from the paper below by COLOUR, never elevation: no shadow here,
// deliberately. See handoff/components/AppBand.md.

import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "./AppHeader";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export interface AppBandProps {
  title: string;
  subtitle?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** SearchField; sits below the title row, inside the band. */
  search?: ReactNode;
  /** Convenience trailing: mono, bandOnMuted. Ignored when `trailing` is set. */
  count?: number;
  /** Injected like Tabs' — without it the count renders Latin digits in an
   *  Arabic-Indic UI, and this package may not import @baydar/shared. */
  formatCount?: (n: number) => string;
  /** Extra band content: a metric row, a ScoreBar with `onBand`, a hero block. */
  children?: ReactNode;
  density?: "comfortable" | "compact";
  /** Applies the top safe-area inset. Set false inside a Sheet. */
  edgeToEdge?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function AppBand({
  title,
  subtitle,
  leading,
  trailing,
  search,
  count,
  formatCount = String,
  children,
  density = "comfortable",
  edgeToEdge = true,
  testID,
  style,
}: AppBandProps): JSX.Element {
  const c = useThemeTokens().color;
  const inset = useSafeAreaInsets().top;

  // The inset plus what is left of the designed band padding, never less than
  // one space step of breathing room — so a 59pt notch and a 24pt Android
  // status bar both land with the title clear of the chrome.
  const paddingTop = edgeToEdge
    ? inset + Math.max(nativeTokens.chrome.bandPaddingTop - inset, nativeTokens.space[4])
    : nativeTokens.space[4];

  const resolvedTrailing =
    trailing ??
    (count === undefined ? undefined : (
      <Text style={[styles.count, { color: c.bandOnMuted }]}>{formatCount(count)}</Text>
    ));

  return (
    <View
      testID={testID}
      style={[
        styles.band,
        {
          backgroundColor: c.band,
          paddingTop,
          paddingBottom:
            density === "compact" ? nativeTokens.space[2] : nativeTokens.chrome.bandPaddingBottom,
        },
        style,
      ]}
    >
      <AppHeader
        tone="band"
        title={title}
        subtitle={subtitle}
        leading={leading}
        trailing={resolvedTrailing}
        search={search}
        compact={density === "compact"}
      />
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: nativeTokens.space[4],
    // ponytail: no shadow, no border — the band is separated by colour. Adding
    // elevation here is the exact thing this redesign removes.
  },
  count: {
    fontFamily: nativeTokens.type.family.mono,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    textAlign: "auto",
  },
  children: {
    gap: nativeTokens.space[2],
  },
});
