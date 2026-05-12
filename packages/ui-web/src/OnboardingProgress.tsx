"use client";

import { cx } from "./cx";

export interface OnboardingProgressStep {
  key: string;
  label: string;
}

export interface OnboardingProgressProps {
  steps: ReadonlyArray<OnboardingProgressStep>;
  active: number;
  ariaLabel: string;
  className?: string;
}

export function OnboardingProgress({
  steps,
  active,
  ariaLabel,
  className,
}: OnboardingProgressProps): JSX.Element {
  const total = steps.length;
  const clamped = Math.max(0, Math.min(active, total - 1));
  const current = steps[clamped];

  return (
    <nav
      aria-label={ariaLabel}
      className={cx("flex w-full flex-col gap-2", className)}
      data-onboarding-progress=""
    >
      <ol
        role="list"
        className="flex w-full items-center gap-1"
        aria-valuenow={clamped + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        {steps.map((step, index) => {
          const state = index < clamped ? "done" : index === clamped ? "active" : "pending";
          return (
            <li
              key={step.key}
              className="flex-1"
              aria-current={state === "active" ? "step" : undefined}
            >
              <span className="sr-only">{step.label}</span>
              <span
                aria-hidden="true"
                className={cx(
                  "block h-1.5 w-full rounded-full transition-colors",
                  state === "done" && "bg-brand-600",
                  state === "active" && "bg-brand-600",
                  state === "pending" && "bg-surface-sunken",
                )}
              />
            </li>
          );
        })}
      </ol>
      {current ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-ink text-sm font-semibold">{current.label}</span>
          <span className="text-ink-muted text-xs font-medium">
            {clamped + 1} / {total}
          </span>
        </div>
      ) : null}
    </nav>
  );
}
