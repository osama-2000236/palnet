"use client";

// Switch — accessible on/off toggle.
//
// Spec: `role="switch"` + `aria-checked` so screen readers announce state.
// Logical `start-*` offset for the thumb so RTL Just Works.

import { type ReactElement } from "react";

import { cx } from "./cx";

export interface SwitchProps {
  checked: boolean;
  onChange(value: boolean): void;
  ariaLabel: string;
  disabled?: boolean;
  id?: string;
  /**
   * Submits with the surrounding `<form>`. The control itself is a `<button>`
   * (a native checkbox cannot carry `role="switch"` semantics cleanly), so the
   * value rides on a hidden input — `name` on the button did nothing at all.
   */
  name?: string;
  /** Points at the row's description text, so the switch announces both. */
  "aria-describedby"?: string;
}

export function Switch({
  checked,
  onChange,
  ariaLabel,
  disabled,
  id,
  name,
  "aria-describedby": ariaDescribedBy,
}: SwitchProps): ReactElement {
  return (
    // A3: the track is 20×36px, well under the 44px minimum. The wrapper takes
    // the press instead — `min-h-target` with the track centred inside — so the
    // hit area is legal without inflating the visual density Settings relies on.
    <span className="min-h-target min-w-target relative inline-flex items-center justify-center">
      {name ? <input type="hidden" name={name} value={checked ? "on" : "off"} /> : null}
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          // A3: `target-area` on the control ITSELF, not only on the wrapper.
          // The wrapper centres it and reserves the space; the expander is what
          // makes the *button* legal, which is what a measuring sweep — or a
          // finger — actually resolves.
          "target-area duration-base ease-standard relative inline-flex h-5 w-9 flex-none rounded-full border transition-colors",
          // A6: the OFF track is 1.23:1 against the surface — no fill in this
          // palette can reach the 3:1 WCAG 1.4.11 needs, so the boundary is a
          // border. `--ink-subtle` measures 5.20 (light) / 5.51 (dark).
          checked ? "bg-brand-600 border-brand-600" : "bg-surface-sunken border-ink-subtle",
          disabled && "cursor-not-allowed opacity-55",
          // The ring is drawn on the visible track, not the padded wrapper.
          "focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "duration-base ease-standard absolute top-0.5 h-4 w-4 rounded-full border transition-transform",
            // A1.1: was `bg-white`, the last hardcoded colour in either kit —
            // and the native twin used `inkInverse`, so the same component was
            // white on web and near-black on native in dark mode. One token now.
            "border-ink-subtle bg-[var(--switch-thumb)]",
            checked ? "start-[18px]" : "start-0.5",
          )}
        />
      </button>
    </span>
  );
}
