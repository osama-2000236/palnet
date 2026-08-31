// ScoreBar — web twin of packages/ui-native/src/ScoreBar.tsx.
//
// The ONE numeric device in the app. Match fit, Karama level, profile
// completion and wage position are all this component — a user learns to read
// one bar, not four.
//
// Never bare (a fill with no number is decoration), never red (a 41% fit is a
// fact about a job, not an error). See handoff/components/ScoreBar.md.
//
// Twin note: native injects `formatNumber` because ui-native may not import
// @baydar/shared. Web keeps the same prop so the two call sites read alike.

import type { CSSProperties, JSX } from "react";

import { cx } from "./cx";

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
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
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
  className,
  style,
  "data-testid": testId,
}: ScoreBarProps): JSX.Element {
  // ponytail: unconditional, not dev-gated. `ui-web` has no `process` global
  // and these are prop-contract violations that throw on the FIRST render of a
  // bad call site — there is no path where one reaches production unseen.
  if (display === "none" && !caption) {
    throw new Error(
      'ScoreBar: display="none" is only legal with a `caption` — a bare bar is decoration.',
    );
  }
  if ((display === "ratio" || display === "value") && max === undefined) {
    throw new Error(`ScoreBar: display="${display}" requires \`max\`.`);
  }

  const total = segments ? clamp(segments.reduce((sum, s) => sum + s.value, 0)) : clamp(value);
  const percent = Math.round(total * 100);
  const resolvedTone: "strong" | "weak" =
    tone === "auto" ? (total < 0.5 ? "weak" : "strong") : tone;

  const fillFor = (segTone: "strong" | "weak"): string =>
    onBand ? "bg-bar-on-band-fill" : segTone === "weak" ? "bg-bar-fill-weak" : "bg-bar-fill";

  let figure: string | null = null;
  if (display === "percent") figure = `${formatNumber(percent)}%`;
  else if (display === "ratio" || display === "value") {
    figure = `${formatNumber(Math.round(total * (max ?? 1)))} / ${formatNumber(max ?? 0)}`;
  }

  const srLabel =
    accessibilityLabel ??
    (label ? `${label} ${formatNumber(percent)}%` : `${formatNumber(percent)}%`);

  return (
    <div className={cx("flex flex-col gap-1", className)} style={style} data-testid={testId}>
      <div className="flex items-center gap-2.5">
        {figure ? (
          // dir="ltr": the figure is a number, and bidi would otherwise reorder
          // "3 / 5" to "5 / 3" on an RTL page. Twin of the native fix.
          <span
            dir="ltr"
            className={cx(
              "font-mono text-sm font-semibold",
              onBand ? "text-band-on" : "text-brand-700",
            )}
          >
            {figure}
          </span>
        ) : null}
        {/* One progressbar, even for segments — not three nested bars. */}
        <div
          role="progressbar"
          aria-label={srLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className={cx(
            "min-w-0 flex-1 overflow-hidden rounded-full",
            size === "lg" ? "h-2" : "h-1.5",
            onBand ? "bg-bar-on-band-track" : "bg-bar-track",
          )}
          data-testid={testId ? `${testId}-track` : undefined}
        >
          {segments ? (
            <div className="flex h-full">
              {segments.map((seg, i) => (
                <div
                  key={`${seg.tone}-${i}`}
                  data-testid={testId ? `${testId}-segment-${i}` : undefined}
                  className={cx("h-full", fillFor(seg.tone))}
                  style={{ width: `${clamp(seg.value) * 100}%` }}
                />
              ))}
            </div>
          ) : (
            <div
              data-testid={testId ? `${testId}-fill` : undefined}
              className={cx("h-full rounded-full", fillFor(resolvedTone))}
              style={{ width: `${percent}%` }}
            />
          )}
        </div>
        {label ? (
          <span className={cx("text-micro", onBand ? "text-band-on-muted" : "text-ink-subtle")}>
            {label}
          </span>
        ) : null}
      </div>
      {caption ? (
        // Logical alignment only: `text-start`/`text-end` follow `dir`, so the
        // caption's far end pins to the bar's far end in both Arabic and English.
        <div className="flex">
          {caption.map((part, i) => (
            <span
              key={part + String(i)}
              className={cx(
                "text-micro min-w-0 flex-1",
                onBand ? "text-band-on-muted" : "text-ink-subtle",
                i === 0 ? "text-start" : i === caption.length - 1 ? "text-end" : "text-center",
              )}
            >
              {part}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
