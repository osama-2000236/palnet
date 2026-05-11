// OnboardingProgress — top-of-screen progress strip for the multi-step
// onboarding flow. Lives in the bare onboarding shell (no AppShell).
// Spec: docs/design/SCREENS.md "Onboarding", and DESIGN.md §11.1.
//
// Renders one dot per step, with a connecting line. The current step is
// `brand-600` filled; completed steps are `brand-600` filled with a check;
// upcoming steps are `surface-sunken`.

import type { JSX } from "react";

import { cx } from "./cx";

export interface OnboardingProgressProps {
  /** 1-based step number. Pass 1 on the first step, totalSteps on the last. */
  step: number;
  totalSteps: number;
  /** Optional accessible label for the whole strip (e.g. "Onboarding progress"). */
  ariaLabel?: string;
  /** Optional per-step labels for screen readers — index 0 = step 1. */
  stepLabels?: readonly string[];
  className?: string;
}

export function OnboardingProgress({
  step,
  totalSteps,
  ariaLabel,
  stepLabels,
  className,
}: OnboardingProgressProps): JSX.Element {
  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);
  return (
    <nav
      aria-label={ariaLabel}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={step}
      role="progressbar"
      className={cx("flex items-center gap-2", className)}
    >
      {dots.map((n, i) => {
        const isCurrent = n === step;
        const isDone = n < step;
        const label = stepLabels?.[i];
        return (
          <span key={n} className="flex items-center gap-2">
            <span
              aria-label={label}
              className={cx(
                "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
                isDone && "bg-brand-600 text-ink-inverse",
                isCurrent && "bg-brand-600 text-ink-inverse ring-brand-100 ring-4",
                !isCurrent && !isDone && "bg-surface-sunken text-ink-muted",
              )}
            >
              {isDone ? (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 13l4 4 10-12" />
                </svg>
              ) : (
                n
              )}
            </span>
            {n < totalSteps ? (
              <span
                aria-hidden="true"
                className={cx(
                  "h-px w-8 rounded-full",
                  isDone ? "bg-brand-600" : "bg-surface-sunken",
                )}
              />
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
