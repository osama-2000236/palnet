"use client";

// Switch — accessible on/off toggle.
//
// Spec: `role="switch"` + `aria-checked` so screen readers announce state.
// Tokenised via Tailwind utilities (`bg-brand-600`, `bg-surface-sunken`).
// Logical `start-*` offset for the thumb so RTL Just Works.
//
// Hoisted from the inline definition originally in
// `apps/web/src/app/[locale]/(app)/settings/notifications/page.tsx`.
// Design Kit ticket: design owes final spec, but the API + behaviour here
// are stable.

import { type ReactElement } from "react";

import { cx } from "./cx";

export interface SwitchProps {
  checked: boolean;
  onChange(value: boolean): void;
  ariaLabel: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function Switch({
  checked,
  onChange,
  ariaLabel,
  disabled,
  id,
  name,
}: SwitchProps): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      name={name}
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "duration-base ease-standard relative inline-flex h-5 w-9 flex-none rounded-full transition-colors focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
        disabled && "cursor-not-allowed opacity-55",
        checked ? "bg-brand-600" : "bg-surface-sunken",
      )}
    >
      <span
        aria-hidden="true"
        className={
          "duration-base ease-standard absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform " +
          (checked ? "start-[18px]" : "start-0.5")
        }
      />
    </button>
  );
}
