// A1.2 — every colour in `packages/ui-native` must resolve at render, not at
// module load.
//
// `StyleSheet.create` evaluates once when the module is imported, so a colour
// written into it is frozen to whichever palette was current then — always
// light. Nine components held 31 such values. Most were masked by an inline
// `useThemeTokens()` override applied later in the style array, which is why
// the bug never showed on screen and why it was still a trap: reorder the array,
// or add one more style, and the frozen value wins.
//
// This mounts each component under both themes and asserts the rendered colours
// actually differ. A component whose colour is frozen — or whose colour went
// missing when the frozen value was deleted — reports identical output in both
// and fails here.

import { getNativeTokens } from "@baydar/ui-native";
import {
  AppHeader,
  ComposerEntry,
  EmptyState,
  RecordCard,
  SearchField,
  Tab,
  Tabs,
  Sheet,
  StateMessage,
  Switch,
  ThemeProvider,
} from "@baydar/ui-native";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";

/** Every colour-ish value in the rendered tree, flattened and sorted. */
function colours(json: unknown): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string" && /color/i.test(key) && /^(#|rgb)/i.test(value)) {
        found.push(`${key}:${value.toLowerCase()}`);
      } else {
        walk(value);
      }
    }
  };
  walk(json);
  return found.sort();
}

/**
 * Light-palette values that genuinely change in dark. Any of these appearing in
 * a dark render is a frozen colour — and asserting "some colour differs" is not
 * enough, because one frozen value hides among the many that do change. That
 * weaker check passed with a frozen `color` deliberately reintroduced, which is
 * why this one exists.
 */
const LIGHT_ONLY = (() => {
  const light = getNativeTokens("light").color as Record<string, unknown>;
  const dark = getNativeTokens("dark").color as Record<string, unknown>;
  // Any value the dark palette legitimately uses, under *any* key. Without
  // this the check false-positives: light `ink` and dark `inkInverse` are the
  // same warm near-black, so a correct dark render trips a naive comparison
  // that only keys on the value.
  const darkValues = new Set(
    Object.values(dark)
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toLowerCase()),
  );

  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(light)) {
    if (typeof value !== "string" || !/^#/.test(value)) continue;
    const lower = value.toLowerCase();
    const counterpart = dark[key];
    if (typeof counterpart !== "string" || counterpart.toLowerCase() === lower) continue;
    if (darkValues.has(lower)) continue;
    out.set(lower, key);
  }
  return out;
})();

const renderBoth = (element: ReactElement): { light: string[]; dark: string[] } => {
  const light = render(<ThemeProvider scheme="light">{element}</ThemeProvider>);
  const lightColours = colours(light.toJSON());
  light.unmount();

  const dark = render(<ThemeProvider scheme="dark">{element}</ThemeProvider>);
  const darkColours = colours(dark.toJSON());
  dark.unmount();

  return { light: lightColours, dark: darkColours };
};

const CASES: [string, ReactElement][] = [
  ["AppHeader", <AppHeader title="الإشعارات" subtitle="آخر التحديثات" />],
  ["ComposerEntry", <ComposerEntry placeholder="شارك فكرة…" onPress={() => {}} />],
  ["EmptyState", <EmptyState motif="search" title="لا توجد نتائج" body="جرّب كلمات أخرى." />],
  ["RecordCard", <RecordCard title="مهندس منصة" subtitle="بيدر" meta="رام الله" />],
  ["SearchField", <SearchField value="" onChangeText={() => {}} placeholder="ابحث" />],
  [
    "Tabs",
    <Tabs value="a" onChange={() => {}}>
      <Tab value="a">فاتح</Tab>
      <Tab value="b">داكن</Tab>
    </Tabs>,
  ],
  ["StateMessage", <StateMessage title="حدث خطأ" message="أعد المحاولة." />],
  // A4.1 — the switch was not in this list at all, so the audit's claim that
  // native-theming covered it was false. Covers the thumb/track colours; the
  // spring itself is still unchecked.
  ["Switch", <Switch checked onChange={() => {}} ariaLabel="إشعارات" />],
  [
    "Sheet",
    <Sheet open onClose={() => {}} title="خيارات">
      <></>
    </Sheet>,
  ],
];

describe("native components re-theme", () => {
  it.each(CASES)("%s renders different colours in dark", (name, element) => {
    const { light, dark } = renderBoth(element);

    // jest's `expect` takes no message argument, so the context goes in the
    // failure itself — a bare `not.toEqual` here would say only "received
    // equals expected", which is the least useful possible report.
    if (light.length === 0) throw new Error(`${name} rendered no colours at all`);
    if (dark.length !== light.length) {
      throw new Error(
        `${name} rendered ${light.length} colours in light but ${dark.length} in dark`,
      );
    }
    if (JSON.stringify(dark) === JSON.stringify(light)) {
      throw new Error(
        `${name} renders identical colours in both themes — a colour is frozen at ` +
          `module scope in StyleSheet.create. Resolve it at render from useThemeTokens().`,
      );
    }
    const leaked = dark
      .map((entry) => entry.split(":").slice(1).join(":"))
      .map((value) => LIGHT_ONLY.get(value))
      .filter(Boolean);
    if (leaked.length > 0) {
      throw new Error(
        `${name} still renders light-palette ${[...new Set(leaked)].join(", ")} in dark — ` +
          `that colour is frozen at module scope in StyleSheet.create.`,
      );
    }

    expect(dark).not.toEqual(light);
  });
});
