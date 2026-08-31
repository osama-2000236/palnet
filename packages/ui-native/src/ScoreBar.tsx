// The ONE numeric device in the app. Match fit, Karama level, profile
// completion and wage position are all this component — which is the point: a
// user learns to read one bar, not four.
//
// Never bare (a fill with no number is decoration), never red (a 41% fit is a
// fact about a job, not an error). See handoff/components/ScoreBar.md.
//
// `formatNumber` is injected for the same reason Tabs injects `formatCount`:
// without it a figure renders as Latin digits inside an Arabic-Indic UI, and
// this package may not import @baydar/shared (CLAUDE.md, framework-neutral).

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type ScoreBarDisplay = "percent" | "ratio" | "value" | "none";
export type ScoreBarTone = "auto" | "strong" | "weak";
export type ScoreBarSize = "sm" | "lg";

export interface ScoreBarSegment {
  value: number;
  tone: "strong" | "weak";
}

export interface ScoreBarProps {
  /** 0–1. Clamped. */
  value: number;
  display?: ScoreBarDisplay;
  /** Required for `ratio` / `value`. */
  max?: number;
  /** Trailing word: fit, Karama, complete. */
  label?: string;
  tone?: ScoreBarTone;
  /** Inverse track/fill, for use inside AppBand. */
  onBand?: boolean;
  size?: ScoreBarSize;
  /** Multi-segment fill (wage range, projected completion). Overrides `value`. */
  segments?: ScoreBarSegment[];
  /** Scale labels under the bar: start, (centre), end. */
  caption?: [string, string] | [string, string, string];
  formatNumber?: (n: number) => string;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const clamp = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : Number.isFinite(n) ? n : 0);

export function ScoreBar({
  value,
  display = "percent",
  max,
  label,
  tone = "auto",
  onBand = false,
  size = "sm",
  segments,
  caption,
  formatNumber = String,
  accessibilityLabel,
  testID,
  style,
}: ScoreBarProps): JSX.Element {
  const c = useThemeTokens().color;

  if (__DEV__ && display === "none" && !caption) {
    throw new Error(
      'ScoreBar: display="none" is only legal with a `caption` — a bare bar is decoration.',
    );
  }
  if (__DEV__ && (display === "ratio" || display === "value") && max === undefined) {
    throw new Error(`ScoreBar: display="${display}" requires \`max\`.`);
  }

  const total = segments ? clamp(segments.reduce((sum, seg) => sum + seg.value, 0)) : clamp(value);
  const percent = Math.round(total * 100);

  const trackColor = onBand ? c.barOnBandTrack : c.barTrack;
  const fillFor = (segTone: "strong" | "weak"): string =>
    onBand ? c.barOnBandFill : segTone === "weak" ? c.barFillWeak : c.barFill;
  const resolvedTone: "strong" | "weak" =
    tone === "auto" ? (total < 0.5 ? "weak" : "strong") : tone;

  const height =
    size === "lg" ? nativeTokens.control.barHeightLarge : nativeTokens.control.barHeight;

  let figure: string | null = null;
  if (display === "percent") figure = `${formatNumber(percent)}%`;
  else if (display === "ratio" || display === "value") {
    figure = `${formatNumber(Math.round(total * (max ?? 1)))} / ${formatNumber(max ?? 0)}`;
  }

  const srLabel =
    accessibilityLabel ??
    (label ? `${label} ${formatNumber(percent)}%` : `${formatNumber(percent)}%`);

  return (
    <View style={[styles.wrap, style]} testID={testID}>
      <View style={styles.row}>
        {figure ? (
          <Text style={[styles.figure, { color: onBand ? c.bandOn : c.brand700 }]}>{figure}</Text>
        ) : null}
        {/* One progressbar, even for segments — not three nested bars. */}
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={srLabel}
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          style={[styles.track, { height, backgroundColor: trackColor }]}
        >
          {segments ? (
            <View style={styles.segments}>
              {segments.map((seg, i) => (
                <View
                  key={`${seg.tone}-${i}`}
                  testID={testID ? `${testID}-segment-${i}` : undefined}
                  style={{
                    width: `${clamp(seg.value) * 100}%`,
                    height: "100%",
                    backgroundColor: fillFor(seg.tone),
                  }}
                />
              ))}
            </View>
          ) : (
            <View
              testID={testID ? `${testID}-fill` : undefined}
              style={[
                styles.fill,
                { width: `${percent}%`, backgroundColor: fillFor(resolvedTone) },
              ]}
            />
          )}
        </View>
        {label ? (
          <Text style={[styles.label, { color: onBand ? c.bandOnMuted : c.inkSubtle }]}>
            {label}
          </Text>
        ) : null}
      </View>
      {caption ? (
        <View style={styles.caption}>
          {caption.map((part, i) => (
            // Alignment via flexbox, not textAlign: Yoga mirrors flex-start /
            // flex-end under RTL, whereas RN's textAlign "right" is physical and
            // lands the caption's far end on the wrong side in Arabic.
            <View
              key={part + String(i)}
              style={[
                styles.captionCell,
                i === 0
                  ? styles.captionStart
                  : i === caption.length - 1
                    ? styles.captionEnd
                    : styles.captionMiddle,
              ]}
            >
              <Text style={[styles.captionText, { color: onBand ? c.bandOnMuted : c.inkSubtle }]}>
                {part}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: nativeTokens.space[1],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    // ponytail: the design asked for space[2.5] (10). The 4px scale has no half
    // step and CLAUDE.md forbids a bare px, so this snaps up to space[3]. Add a
    // 2.5 step to tokens.space only if the 2px shows up in a real screenshot.
    gap: nativeTokens.space[3],
  },
  figure: {
    fontFamily: nativeTokens.type.family.mono,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontWeight: "600",
    textAlign: "auto",
  },
  track: {
    flex: 1,
    borderRadius: nativeTokens.radius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: nativeTokens.radius.full,
  },
  segments: {
    flexDirection: "row",
    height: "100%",
  },
  label: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.micro.size,
    lineHeight: nativeTokens.type.scale.micro.line,
    textAlign: "auto",
  },
  caption: {
    flexDirection: "row",
  },
  captionCell: {
    flex: 1,
    minWidth: 0,
  },
  captionText: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.micro.size,
    lineHeight: nativeTokens.type.scale.micro.line,
    textAlign: "auto",
  },
  captionStart: {
    alignItems: "flex-start",
  },
  captionMiddle: {
    alignItems: "center",
  },
  captionEnd: {
    alignItems: "flex-end",
  },
});
