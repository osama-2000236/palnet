// OnboardingProgress — sits at the top of the bare onboarding shell.
// Spec: design-pass-1/component-changes.md. Three visual styles share one
// ARIA progressbar contract. Default `bar`; `dots` and `segmented` exist
// for future step-preview use.

import type { JSX } from "react";

import { cx } from "./cx";

export type OnboardingProgressStyle = "bar" | "dots" | "segmented";

export interface OnboardingProgressProps {
  /** 1-indexed current step; clamped 1..total. */
  current: number;
  total: number;
  style?: OnboardingProgressStyle;
  /** Optional per-step labels. Length must equal `total` when provided. */
  labels?: string[];
  /** Locale used for the tabular fraction copy. */
  locale?: "ar" | "en";
  /**
   * A1.6 — locale-aware number formatter, injected rather than imported.
   * `packages/ui-*` may not depend on `@baydar/shared` (CLAUDE.md: shared UI is
   * framework-neutral), which is exactly why the injected-formatter prop exists
   * elsewhere in this kit. Both kits used to hand-roll the same Arabic-Indic
   * digit table instead, so one question had three answers: an injected
   * formatter in AppShell, a copy-pasted table here and in the native twin, and
   * nothing at all in Tabs. Defaults to the old behaviour when omitted.
   */
  formatCount?: (n: number) => string;
  className?: string;
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
  className,
}: OnboardingProgressProps): JSX.Element {
  const safe = Math.max(1, Math.min(total, current));
  const pct = (safe / total) * 100;
  const label = labels?.[safe - 1];
  const counter = fraction(safe, total, formatCount ?? defaultFormat(locale));

  if (style === "dots") {
    return (
      <div
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={label ?? counter}
        className={cx("flex items-center gap-2 px-4 py-2.5", className)}
      >
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const state = n < safe ? "done" : n === safe ? "now" : "next";
          return (
            <span
              key={n}
              aria-hidden="true"
              className={cx(
                "ease-standard h-2 rounded-full transition-[width,background-color]",
                state === "now"
                  ? "bg-brand-600 w-6"
                  : state === "done"
                    ? "bg-brand-300 w-2"
                    : "bg-surface-sunken w-2",
              )}
              style={{ transitionDuration: "var(--dur-slow)" }}
            />
          );
        })}
        <span
          dir="ltr"
          className="text-micro text-ink-subtle ms-auto font-mono tabular-nums tracking-[.04em]"
        >
          {counter}
        </span>
      </div>
    );
  }

  if (style === "segmented") {
    return (
      <div
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={label ?? counter}
        className={cx("flex gap-1 px-4 pt-3", className)}
      >
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const filled = n <= safe;
          return (
            <div key={n} className="flex flex-1 flex-col gap-1">
              <span
                aria-hidden="true"
                className={cx(
                  "h-1 rounded-sm transition-colors",
                  filled ? "bg-brand-600" : "bg-surface-sunken",
                )}
                style={{ transitionDuration: "var(--dur-slow)" }}
              />
              {labels?.[i] ? (
                <span
                  className={cx(
                    "text-micro font-mono tracking-[.04em]",
                    n === safe ? "text-brand-700 font-semibold" : "text-ink-subtle font-medium",
                  )}
                >
                  {labels[i]}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  // bar (default)
  return (
    <div
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={label ?? counter}
      className={cx("flex flex-col gap-2 px-5 py-3", className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        {label ? <span className="text-small text-ink font-semibold">{label}</span> : <span />}
        <span
          dir="ltr"
          className="text-micro text-ink-subtle font-mono tabular-nums tracking-[.04em]"
        >
          {counter}
        </span>
      </div>
      <div className="bg-surface-sunken h-1.5 overflow-hidden rounded-full">
        <div
          aria-hidden="true"
          className="bg-brand-600 ease-standard h-full transition-[width]"
          style={{ width: `${pct}%`, transitionDuration: "var(--dur-slow)" }}
        />
      </div>
    </div>
  );
}
