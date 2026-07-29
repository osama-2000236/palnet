// Tabs — native twin of packages/ui-web/src/Tabs.tsx.
//
// Was `SegmentedControl`, with `items`/`selectedKey`/`onChange` against web's
// `value`/`onChange` and `<Tab>` children. Two names and two prop shapes for
// one concept, which `scripts/check-ui-lockstep.mjs` recorded as drift and
// DESIGN.md §6.3 had already settled: "Segmented olive control — `Tabs` for
// filters and sub-routes."
//
// The VISUALS are still the pill strip this control has always drawn, not the
// `brand-600` underline DESIGN.md specifies. That is a real remaining gap and
// deliberately not in this change: moving it is a pixel change across five
// screens and belongs with device evidence, which docs/HANDOFF.md records as
// owed. This commit moves the API only, so the twins can be checked by name.
//
// No `count` prop: web's tabs carry unread badges and no native screen does.
// Adding an unused badge to reach prop parity would be parity theatre.

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

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
  return (
    <Ctx.Provider value={{ value, onChange }}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={label}
        testID={testID}
        style={[styles.wrap, style]}
      >
        {children}
      </View>
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
      style={({ pressed }) => [
        styles.item,
        selected
          ? { borderColor: c.brand600, backgroundColor: c.brand600 }
          : { borderColor: c.lineHard, backgroundColor: c.surface },
        pressed ? styles.itemPressed : null,
      ]}
    >
      <Text numberOfLines={1} style={[styles.label, { color: selected ? c.inkInverse : c.ink }]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: nativeTokens.space[2],
  },
  item: {
    minHeight: nativeTokens.chrome.minHit,
    minWidth: 0,
    flexBasis: 0,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: nativeTokens.radius.full,
    borderWidth: 1,
    paddingHorizontal: nativeTokens.space[3],
  },
  itemPressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "700",
  },
});
