"use client";

import { useId, type ReactNode } from "react";

import { cx } from "./cx";

export interface RadioGroupItem {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps {
  items: readonly RadioGroupItem[];
  value: string;
  onValueChange(value: string): void;
  name?: string;
  legend?: ReactNode;
  error?: boolean;
  errorMessage?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function RadioGroup({
  items,
  value,
  onValueChange,
  name,
  legend,
  error = false,
  errorMessage,
  disabled = false,
  className,
}: RadioGroupProps): JSX.Element {
  const generatedName = useId();
  const groupName = name ?? generatedName;

  return (
    // A2.2: the `role="radiogroup"` used to sit on an inner <div>, so the
    // <legend> named the <fieldset> and the ARIA group had no accessible name
    // at all. A <fieldset> already exposes `group` semantics named by its
    // legend, so the redundant role is gone rather than re-pointed.
    <fieldset className={cx("flex flex-col gap-2", className)} aria-invalid={error || undefined}>
      {legend ? <legend className="text-ink text-sm font-semibold">{legend}</legend> : null}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const checked = item.value === value;
          const isDisabled = disabled || item.disabled;
          return (
            <label
              key={item.value}
              className={cx(
                // A3: the pill rendered 32px tall.
                "target-area min-h-target inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                // A2.1: the <input> is `sr-only`, so keyboard focus landed on an
                // invisible element and the visible pill showed nothing — a
                // WCAG 2.4.7 failure on a control used throughout onboarding.
                // `peer` lets the real focus state drive a ring on the pill.
                "has-[:focus-visible]:[box-shadow:var(--focus-ring)]",
                checked
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-line-hard bg-surface text-ink-muted hover:bg-surface-subtle",
                isDisabled && "cursor-not-allowed opacity-55",
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={item.value}
                checked={checked}
                disabled={isDisabled}
                onChange={() => {
                  if (!isDisabled) onValueChange(item.value);
                }}
                className="peer sr-only"
              />
              {/* Selection is not carried by colour alone: the dot fills and the
                  border thickens, so it survives a monochrome or CVD view. */}
              <span
                aria-hidden="true"
                className={cx(
                  "h-2 w-2 rounded-full border",
                  checked ? "border-brand-600 bg-brand-600" : "border-ink-subtle bg-transparent",
                )}
              />
              <span>{item.label}</span>
              {item.description ? <span className="sr-only">{item.description}</span> : null}
            </label>
          );
        })}
      </div>
      {errorMessage ? <p className="text-danger text-xs">{errorMessage}</p> : null}
    </fieldset>
  );
}
