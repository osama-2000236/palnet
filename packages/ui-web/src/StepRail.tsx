// StepRail — web twin of packages/ui-native/src/StepRail.tsx.
//
// The application lifecycle as one horizontal device: sent → seen → interview
// → decision. Used by the worker's applications list AND the employer's
// post-a-job wizard — one vocabulary, not two progress widgets.
//
// Replaces the status BADGE as the primary signal. The badge stays, but it is a
// label; the rail is the position. See handoff/components/StepRail.md.
//
// RTL is the default, not a mirror: a plain flex row under `dir="rtl"` is
// reversed by the browser. Never hand-flip with `flex-row-reverse`.

import type { CSSProperties, JSX } from "react";

import { cx } from "./cx";

export interface StepRailStep {
  key: string;
  label: string;
}

export interface StepRailProps {
  /** 3–5 steps. Four is the designed case. */
  steps: StepRailStep[];
  /** Index of the current step. `-1` = nothing reached yet. */
  current: number;
  terminal?: "none" | "success" | "closed";
  /** Colour of the CURRENT node only. Completed nodes are always brand-600. */
  tone?: "brand" | "accent";
  /** Hides labels; rail only. For dense list rows. */
  compact?: boolean;
  accessibilityLabel?: string;
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}

export function StepRail({
  steps,
  current,
  terminal = "none",
  tone = "accent",
  compact = false,
  accessibilityLabel,
  className,
  style,
  "data-testid": testId,
}: StepRailProps): JSX.Element {
  // ponytail: unconditional — see the note in ScoreBar.
  if (steps.length < 3 || steps.length > 5) {
    throw new Error(`StepRail: expected 3–5 steps, received ${steps.length}.`);
  }

  const closed = terminal === "closed";
  const currentColor = closed
    ? "bg-bar-track"
    : tone === "brand"
      ? "bg-brand-600"
      : "bg-accent-500";
  const currentText = closed
    ? "text-ink-subtle"
    : tone === "brand"
      ? "text-brand-600"
      : "text-accent-500";

  const nodeColor = (i: number): string => {
    if (closed) return "bg-bar-track";
    if (i < current) return "bg-brand-600";
    if (i === current) return currentColor;
    return "bg-bar-track";
  };

  const currentStep = current >= 0 ? steps[current] : undefined;
  const label =
    accessibilityLabel ??
    (currentStep
      ? `${currentStep.label} — ${current + 1} / ${steps.length}`
      : `0 / ${steps.length}`);

  return (
    <div className={cx("flex flex-col gap-2", className)} style={style} data-testid={testId}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
        className="flex items-center"
      >
        {steps.map((step, i) => (
          <div key={step.key} className="flex flex-1 items-center">
            <div
              data-testid={testId ? `${testId}-segment-${i}` : undefined}
              className={cx(
                "h-[5px] flex-1 rounded-full",
                !closed && i <= current ? "bg-bar-fill" : "bg-bar-track",
              )}
            />
            <div
              aria-hidden="true"
              data-testid={testId ? `${testId}-node-${i}` : undefined}
              className={cx(
                "-mx-px rounded-full",
                i === current ? "border-surface size-[11px] border-2" : "size-[9px]",
                nodeColor(i),
              )}
            />
          </div>
        ))}
        {/* One more segment than nodes: the tail past the last node. */}
        <div
          data-testid={testId ? `${testId}-segment-${steps.length}` : undefined}
          className={cx(
            "h-[5px] flex-1 rounded-full",
            !closed && current >= steps.length - 1 && terminal === "success"
              ? "bg-bar-fill"
              : "bg-bar-track",
          )}
        />
      </div>
      {compact ? null : (
        <div className="flex">
          {steps.map((step, i) => (
            <span
              key={step.key}
              className={cx(
                "text-micro min-w-0 flex-1 truncate",
                i === current && !closed ? cx(currentText, "font-bold") : "text-ink-subtle",
                i === 0 ? "text-start" : i === steps.length - 1 ? "text-end" : "text-center",
              )}
            >
              {step.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
