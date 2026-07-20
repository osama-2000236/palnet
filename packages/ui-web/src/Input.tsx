// Input — the single text-input primitive for Baydar. Spec:
// design-handoff-2026-05/MISSING-ELEMENTS.md §02.
//
// Replaces the 4 raw <input> styles drifting across:
//   • jobs/page.tsx (filters bar)
//   • settings/account/page.tsx
//   • (auth)/login/LoginForm.tsx + (auth)/register/page.tsx
//   • messages/new/page.tsx
//
// Native twin lives at packages/ui-native/src/Input.tsx (must keep this prop
// API). The "Input" wraps a single <input>; for multi-line, use <Textarea>.
//
// Rules:
//   • Always pair with a visible <label> OR `aria-label`.
//   • For required fields, set `required` AND mark the label visually.
//   • Pass `error` (boolean) + `errorMessage` to render the danger border
//     + helper text. Don't roll your own.
//   • `leading` / `trailing` accept any React node — usually an <Icon />.
//   • The component forwards refs, so it works with react-hook-form and
//     `useFocus()` patterns without ceremony.

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cx } from "./cx";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<ComponentPropsWithoutRef<"input">, "size"> {
  /** Visual size — matches Button's scale. Default `md` (36px tall). */
  size?: InputSize;
  /** Render the danger border + invalid styling. */
  error?: boolean;
  /** Helper or error message below the field. Pair with `error={true}` for the danger color. */
  errorMessage?: string;
  /** Helper message when not in error state. */
  helper?: string;
  /** Icon or node rendered inside the field, leading edge. */
  leading?: ReactNode;
  /** Icon or node rendered inside the field, trailing edge. */
  trailing?: ReactNode;
  /** Stretch to the host container's full width. */
  fullWidth?: boolean;
  /** Wrapper class (rare — most styling is internal). */
  className?: string;
}

const SIZE_CLASSES: Record<InputSize, string> = {
  // Heights match Button: 28 / 36 / 44 px.
  sm: "h-7 text-[13px] px-2.5",
  md: "h-9 text-sm px-3",
  lg: "h-11 text-[15px] px-3.5",
};

const ICON_PADDING: Record<InputSize, { leading: string; trailing: string }> = {
  sm: { leading: "ps-7", trailing: "pe-7" },
  md: { leading: "ps-9", trailing: "pe-9" },
  lg: { leading: "ps-10", trailing: "pe-10" },
};

const ICON_INSET: Record<InputSize, string> = {
  sm: "start-2",
  md: "start-3",
  lg: "start-3.5",
};
const ICON_INSET_TRAIL: Record<InputSize, string> = {
  sm: "end-2",
  md: "end-3",
  lg: "end-3.5",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = "md",
    error = false,
    errorMessage,
    helper,
    leading,
    trailing,
    fullWidth = false,
    disabled,
    className,
    id,
    "aria-describedby": ariaDescribedBy,
    ...rest
  },
  ref,
): JSX.Element {
  // Auto-wire aria-describedby to the helper element when one is rendered.
  // If the consumer already passed `aria-describedby`, append rather than replace.
  const helperId = (errorMessage || helper) && id ? `${id}-helper` : undefined;
  const describedBy =
    helperId && ariaDescribedBy ? `${ariaDescribedBy} ${helperId}` : (helperId ?? ariaDescribedBy);

  return (
    <span className={cx("inline-flex flex-col gap-1", fullWidth && "w-full")}>
      <span className={cx("relative inline-flex items-stretch", fullWidth && "w-full")}>
        {leading ? (
          <span
            aria-hidden="true"
            className={cx(
              "text-ink-subtle pointer-events-none absolute top-1/2 -translate-y-1/2",
              ICON_INSET[size],
            )}
          >
            {leading}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={describedBy}
          className={cx(
            // layout / shape
            "bg-surface text-ink w-full rounded-md border",
            "placeholder:text-ink-subtle",
            "duration-base ease-standard transition-colors",
            // focus ring (keyboard-only — matches Button)
            "focus-visible:border-brand-600 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
            // hover (only when not focused/disabled — outline strengthens)
            "hover:border-line-hard",
            // sizing
            SIZE_CLASSES[size],
            // icon padding
            leading ? ICON_PADDING[size].leading : null,
            trailing ? ICON_PADDING[size].trailing : null,
            // state
            error ? "border-danger focus-visible:border-danger" : "border-line-hard",
            disabled && "bg-surface-subtle text-ink-subtle cursor-not-allowed",
            className,
          )}
          {...rest}
        />
        {trailing ? (
          <span
            aria-hidden="true"
            className={cx(
              "text-ink-subtle pointer-events-none absolute top-1/2 -translate-y-1/2",
              ICON_INSET_TRAIL[size],
            )}
          >
            {trailing}
          </span>
        ) : null}
      </span>
      {errorMessage || helper ? (
        <span
          id={helperId}
          className={cx("text-[12px]", errorMessage ? "text-danger" : "text-ink-muted")}
        >
          {errorMessage ?? helper}
        </span>
      ) : null}
    </span>
  );
});
