// Tabs — native twin of packages/ui-web/src/Tabs.tsx.
//
// Was `SegmentedControl`, with `items`/`selectedKey`/`onChange` against web's
// `value`/`onChange` and `<Tab>` children. That rename converged the API; this
// is the visual half it deliberately left owed, tracked in
// docs/design/PARITY.md: DESIGN.md §6.3 specifies a `brand-600` underline with
// an `ink` label, and this control was still drawing the filled pill strip.
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
// No `count` prop: web's tabs carry unread badges and no native screen does.
// Adding an unused badge to reach prop parity would be parity theatre.

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
}
const Ctx = createContext<TabsCtx | null>(null);

export interface TabsProps {
  value: string;
  onChange(next: string): void;
  children: ReactNode;
  /** Names the tab strip for assistive tech, matching web's `label`. */
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Tabs({ value, onChange, children, label, style, testID }: TabsProps): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <Ctx.Provider value={{ value, onChange }}>
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
  accessibilityLabel?: string;
  testID?: string;
}

export function Tab({ value, children, accessibilityLabel, testID }: TabProps): JSX.Element {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("<Tab> must be used inside <Tabs>");
  const c = useThemeTokens().color;
  const selected = ctx.value === value;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : value)}
      accessibilityState={{ selected }}
      onPress={() => ctx.onChange(value)}
      style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
    >
      <Text numberOfLines={1} style={[styles.label, { color: selected ? c.ink : c.inkMuted }]}>
        {children}
      </Text>
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
  label: {
    paddingVertical: nativeTokens.space[3],
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    // 600 not 500: only 400/600/700 of IBMPlexSansArabic are registered in
    // apps/mobile/app/_layout.tsx, so 500 synthesises.
    fontWeight: "600",
  },
  indicator: {
    height: 2,
    alignSelf: "stretch",
    borderRadius: nativeTokens.radius.full,
  },
});
