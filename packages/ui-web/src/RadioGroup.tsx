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
    <fieldset className={cx("flex flex-col gap-2", className)} aria-invalid={error || undefined}>
      {legend ? <legend className="text-ink text-sm font-semibold">{legend}</legend> : null}
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {items.map((item) => {
          const checked = item.value === value;
          const isDisabled = disabled || item.disabled;
          return (
            <label
              key={item.value}
              className={cx(
                "inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
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
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cx("h-2 w-2 rounded-full", checked ? "bg-brand-600" : "bg-line-hard")}
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
