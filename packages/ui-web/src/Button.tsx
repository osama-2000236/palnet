// Button — the primary interactive element on the web. Spec:
// docs/components/Button.md. The native twin lives at
// packages/ui-native/src/Button.tsx and must keep the same prop API.
//
// Rules:
//   • One `primary` per screen.
//   • `accent` is for the rare emphasis button (PYMK Connect, etc.).
//   • Icon-only buttons require `aria-label`.
//   • Focus ring visible on keyboard only (`focus-visible:`).

import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cx } from "./cx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "accent"
  | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<ComponentPropsWithoutRef<"button">, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leading?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-ink-inverse border border-brand-600 hover:bg-brand-700 hover:border-brand-700",
  secondary:
    "bg-surface text-ink border border-line-hard hover:bg-surface-subtle",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-surface-subtle",
  accent:
    "bg-accent-600 text-ink-inverse border border-accent-600 hover:bg-accent-700 hover:border-accent-700",
  "danger-ghost":
    "bg-transparent text-danger border border-transparent hover:bg-danger/10",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // Heights come from the spec table: 28 / 36 / 44 px.
  sm: "h-7 px-2.5 text-[13px] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  leading,
  trailing,
  loading = false,
  fullWidth = false,
  disabled,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        // layout / shape
        "inline-flex select-none items-center justify-center rounded-md font-semibold",
        "transition-colors duration-150 ease-out",
        // focus ring: keyboard-only
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        // active: spec says 1px press on web
        "active:translate-y-px",
        // disabled
        isDisabled && "cursor-not-allowed opacity-55 hover:bg-[inherit]",
        fullWidth && "w-full",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-e-transparent"
        />
      ) : leading ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {leading}
        </span>
      ) : null}
      {children !== undefined && children !== null ? (
        <span className="inline-flex items-center">{children}</span>
      ) : null}
      {trailing && !loading ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {trailing}
        </span>
      ) : null}
    </button>
  );
}
