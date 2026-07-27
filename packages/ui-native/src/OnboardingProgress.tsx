// OnboardingProgress — native twin of packages/ui-web/src/OnboardingProgress.tsx.
// Same prop API + ARIA-equivalent accessibility (progressbar role + valuemin/now/max).

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type OnboardingProgressStyle = "bar" | "dots" | "segmented";

export interface OnboardingProgressProps {
  current: number;
  total: number;
  style?: OnboardingProgressStyle;
  labels?: string[];
  locale?: "ar" | "en";
  /** A1.6 — see the web twin. Injected, because the kit may not import shared. */
  formatCount?: (n: number) => string;
  containerStyle?: StyleProp<ViewStyle>;
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Fallback when no formatter is injected — preserves the previous output. */
function defaultFormat(locale: "ar" | "en"): (n: number) => string {
  if (locale !== "ar") return String;
  return (n) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d] ?? d);
}

function fraction(current: number, total: number, format: (n: number) => string): string {
  return `${format(current)} / ${format(total)}`;
}

export function OnboardingProgress({
  current,
  total,
  style = "bar",
  labels,
  locale = "ar",
  formatCount,
  containerStyle,
}: OnboardingProgressProps): JSX.Element {
  const c = useThemeTokens().color;
  const safe = Math.max(1, Math.min(total, current));
  const pct = (safe / total) * 100;
  const label = labels?.[safe - 1];
  const counter = fraction(safe, total, formatCount ?? defaultFormat(locale));

  const a11y = {
    accessible: true,
    accessibilityRole: "progressbar" as const,
    accessibilityLabel: label ?? counter,
    accessibilityValue: { min: 1, max: total, now: safe, text: counter },
  };

  if (style === "dots") {
    return (
      <View
        {...a11y}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
          },
          containerStyle,
        ]}
      >
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const state = n < safe ? "done" : n === safe ? "now" : "next";
          const bg = state === "now" ? c.brand600 : state === "done" ? c.brand300 : c.surfaceSunken;
          const w = state === "now" ? 24 : 8;
          return (
            <View
              key={n}
              style={{ width: w, height: 8, borderRadius: 9999, backgroundColor: bg }}
            />
          );
        })}
        <Text style={[styles.counter, { color: c.inkSubtle, marginStart: "auto" }]}>{counter}</Text>
      </View>
    );
  }

  if (style === "segmented") {
    return (
      <View
        {...a11y}
        style={[
          { flexDirection: "row", gap: 4, paddingHorizontal: 16, paddingTop: 12 },
          containerStyle,
        ]}
      >
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const filled = n <= safe;
          return (
            <View key={n} style={{ flex: 1, gap: 4 }}>
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: filled ? c.brand600 : c.surfaceSunken,
                }}
              />
              {labels?.[i] ? (
                <Text
                  style={{
                    fontFamily: nativeTokens.type.family.mono,
                    fontSize: nativeTokens.type.scale.micro.size,
                    letterSpacing: 0.4,
                    color: n === safe ? c.brand700 : c.inkSubtle,
                    fontWeight: n === safe ? "600" : "500",
                  }}
                >
                  {labels[i]}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View
      {...a11y}
      style={[{ gap: 8, paddingHorizontal: 20, paddingVertical: 12 }, containerStyle]}
    >
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
      >
        {label ? (
          <Text
            style={{
              color: c.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
              fontWeight: "600",
            }}
          >
            {label}
          </Text>
        ) : (
          <View />
        )}
        <Text style={[styles.counter, { color: c.inkSubtle }]}>{counter}</Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: c.surfaceSunken,
          borderRadius: 9999,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: c.brand600,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  counter: {
    fontFamily: nativeTokens.type.family.mono,
    fontSize: nativeTokens.type.scale.micro.size,
    letterSpacing: 0.4,
    // "٢ / ٤" is a numeric run with a separator — under RTL the bidi algorithm
    // swaps the two numbers. Pin it LTR, same as the web twin. See RTL.md.
    writingDirection: "ltr",
  },
});
