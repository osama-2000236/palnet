// Tabs — native twin of packages/ui-web/src/Tabs.tsx.
//
// Was `SegmentedControl`, with `items`/`selectedKey`/`onChange` against web's
// `value`/`onChange` and `<Tab>` children. That rename converged the API, and
// the visual half it left owed is paid: DESIGN.md §6.3's `brand-600` underline
// under an `ink` label, verified on device (docs/HANDOFF.md), not the filled
// pill strip this control used to draw.
//
// Two things carried over from web's twin rather than re-derived, because both
// are bugs it already hit and fixed:
//
//   - The indicator is a child of the tab, stretched to the tab's own width,
//     not a bottom border on the strip. An indicator anchored to the strip
//     only lands under the right tab while that tab sits on the last row.
//   - The strip SCROLLS, it does not wrap. Wrapping was the first fix for
//     Arabic labels overflowing at 390px, and it moved the problem rather than
//     solving it: five profile tabs on two rows put the indicator in the gap
//     *between* the rows, reading as an overline on whichever tab fell under
//     it. One row that scrolls is what web settled on.
//
// `count` matches web's, including the injected `formatCount`: without it a
// count renders as Latin digits inside an Arabic-Indic UI, and this package may
// not import @baydar/shared (CLAUDE.md, "shared UI is framework-neutral").

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

interface TabsCtx {
  value: string;
  onChange(next: string): void;
  formatCount(n: number): string;
}
const Ctx = createContext<TabsCtx | null>(null);

export interface TabsProps {
  value: string;
  onChange(next: string): void;
  children: ReactNode;
  /** Names the tab strip for assistive tech, matching web's `label`. */
  label?: string;
  /** Locale-aware number formatter for tab counts. Same contract as web's. */
  formatCount?: (n: number) => string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Tabs({
  value,
  onChange,
  children,
  label,
  formatCount = String,
  style,
  testID,
}: TabsProps): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <Ctx.Provider value={{ value, onChange, formatCount }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={label}
        testID={testID}
        // `flexGrow: 0` or a horizontal ScrollView in a column parent claims the
        // remaining height and pushes the list below it off the screen.
        style={[styles.wrap, { borderBottomColor: c.lineSoft }, style]}
        contentContainerStyle={styles.strip}
      >
        {children}
      </ScrollView>
    </Ctx.Provider>
  );
}

export interface TabProps {
  value: string;
  children: ReactNode;
  /** Hidden at 0, like web's — a "0" badge is noise, not information. */
  count?: number;
  accessibilityLabel?: string;
  testID?: string;
}

export function Tab({ value, children, count, accessibilityLabel, testID }: TabProps): JSX.Element {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("<Tab> must be used inside <Tabs>");
  const c = useThemeTokens().color;
  const selected = ctx.value === value;
  const hasCount = typeof count === "number" && count > 0;
  const label = typeof children === "string" ? children : value;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      // The badge is decorative for a screen reader on web (`aria-hidden`);
      // RN has no such split inside a Pressable, so the count joins the label.
      accessibilityLabel={
        accessibilityLabel ?? (hasCount ? `${label} (${ctx.formatCount(count)})` : label)
      }
      accessibilityState={{ selected }}
      onPress={() => ctx.onChange(value)}
      style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
    >
      <View style={styles.labelRow}>
        <Text numberOfLines={1} style={[styles.label, { color: selected ? c.ink : c.inkMuted }]}>
          {children}
        </Text>
        {hasCount ? (
          <View style={[styles.badge, { backgroundColor: selected ? c.brand50 : c.surfaceSubtle }]}>
            <Text style={[styles.badgeText, { color: selected ? c.brand700 : c.inkMuted }]}>
              {ctx.formatCount(count)}
            </Text>
          </View>
        ) : null}
      </View>
      <View
        style={[styles.indicator, { backgroundColor: selected ? c.brand600 : "transparent" }]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 0,
    borderBottomWidth: 1,
  },
  strip: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  item: {
    // Pinned in both axes: a tab is sized by its label, and the short ones
    // ("الشركات" on /search) fall under 44 on width alone.
    minHeight: nativeTokens.chrome.minHit,
    minWidth: nativeTokens.chrome.minHit,
    marginEnd: nativeTokens.space[6],
    alignItems: "center",
    justifyContent: "flex-end",
  },
  itemPressed: {
    opacity: 0.85,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
    // The vertical padding lives here, not on the label: with a badge beside
    // it, padding on the text alone stops centring the two against each other.
    paddingVertical: nativeTokens.space[3],
  },
  label: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    // 600 not 500: only 400/600/700 of IBMPlexSansArabic are registered in
    // apps/mobile/app/_layout.tsx, so 500 synthesises.
    fontWeight: "600",
  },
  badge: {
    borderRadius: nativeTokens.radius.full,
    paddingHorizontal: nativeTokens.space[2],
    paddingVertical: nativeTokens.space[0],
  },
  badgeText: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.micro.size,
    lineHeight: nativeTokens.type.scale.caption.line,
    fontWeight: "600",
  },
  indicator: {
    height: 2,
    alignSelf: "stretch",
    borderRadius: nativeTokens.radius.full,
  },
});
