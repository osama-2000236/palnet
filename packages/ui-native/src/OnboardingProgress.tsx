// OnboardingProgress — native twin of packages/ui-web/src/OnboardingProgress.tsx.
// Same prop API + ARIA-equivalent accessibility (progressbar role + valuemin/now/max).

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { nativeTokens } from "./tokens";

export type OnboardingProgressStyle = "bar" | "dots" | "segmented";

export interface OnboardingProgressProps {
  current: number;
  total: number;
  style?: OnboardingProgressStyle;
  labels?: string[];
  locale?: "ar" | "en";
  containerStyle?: StyleProp<ViewStyle>;
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
function toAr(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d] ?? d);
}
function fraction(current: number, total: number, locale: "ar" | "en"): string {
  if (locale === "ar") return `${toAr(current)} / ${toAr(total)}`;
  return `${current} / ${total}`;
}

export function OnboardingProgress({
  current,
  total,
  style = "bar",
  labels,
  locale = "ar",
  containerStyle,
}: OnboardingProgressProps): JSX.Element {
  const safe = Math.max(1, Math.min(total, current));
  const pct = (safe / total) * 100;
  const label = labels?.[safe - 1];
  const counter = fraction(safe, total, locale);

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
          { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
          containerStyle,
        ]}
      >
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const state = n < safe ? "done" : n === safe ? "now" : "next";
          const bg =
            state === "now"
              ? nativeTokens.color.brand600
              : state === "done"
                ? nativeTokens.color.brand300
                : nativeTokens.color.surfaceSunken;
          const w = state === "now" ? 24 : 8;
          return <View key={n} style={{ width: w, height: 8, borderRadius: 9999, backgroundColor: bg }} />;
        })}
        <Text style={[styles.counter, { marginStart: "auto" }]}>{counter}</Text>
      </View>
    );
  }

  if (style === "segmented") {
    return (
      <View
        {...a11y}
        style={[{ flexDirection: "row", gap: 4, paddingHorizontal: 16, paddingTop: 12 }, containerStyle]}
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
                  backgroundColor: filled ? nativeTokens.color.brand600 : nativeTokens.color.surfaceSunken,
                }}
              />
              {labels?.[i] ? (
                <Text
                  style={{
                    fontFamily: nativeTokens.type.family.mono,
                    fontSize: 10,
                    letterSpacing: 0.4,
                    color: n === safe ? nativeTokens.color.brand700 : nativeTokens.color.inkSubtle,
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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        {label ? (
          <Text
            style={{
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {label}
          </Text>
        ) : (
          <View />
        )}
        <Text style={styles.counter}>{counter}</Text>
      </View>
      <View
        style={{
          height: 6,
          backgroundColor: nativeTokens.color.surfaceSunken,
          borderRadius: 9999,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: nativeTokens.color.brand600,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  counter: {
    fontFamily: nativeTokens.type.family.mono,
    fontSize: 11,
    color: nativeTokens.color.inkSubtle,
    letterSpacing: 0.4,
  },
});
