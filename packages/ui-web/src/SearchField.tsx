"use client";

// SearchField — web twin of packages/ui-native/src/SearchField.tsx.
//
// A search pill: icon, input, and a clear button once there is something to
// clear. Native had this component and web did not, so web repeated the
// composition — `Input` + a leading search icon, none of them with a clear
// button — at three call sites, plus a fourth private variant inside AppShell's
// chrome. That fourth one is why the parity ledger called this "chrome-bound":
// it was, and it did not need to be.
//
// Everything not listed below spreads onto the <input>, so a caller that needs
// `onKeyDown` (AppShell submits on Enter) or `onFocus` still has it.

import { forwardRef, type ComponentPropsWithoutRef, type JSX } from "react";

import { cx } from "./cx";
import { Icon } from "./Icon";

export interface SearchFieldProps extends Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "className"
> {
  /** Renders the clear button when there is a `value`. Same contract as native. */
  onClear?(): void;
  clearLabel?: string;
  containerClassName?: string;
  inputClassName?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onClear, clearLabel = "Clear", containerClassName, inputClassName, ...rest },
  ref,
): JSX.Element {
  const canClear = Boolean(value && onClear);

  return (
    <div
      className={cx(
        "bg-surface-subtle flex min-w-0 items-center gap-2 rounded-full px-3.5 py-2",
        "focus-within:[box-shadow:var(--focus-ring)]",
        containerClassName,
      )}
    >
      <span className="text-ink-muted shrink-0" aria-hidden="true">
        <Icon name="search" size={16} />
      </span>
      <input
        {...rest}
        ref={ref}
        type="search"
        value={value}
        className={cx(
          "text-ink placeholder:text-ink-muted min-w-0 flex-1",
          // The ring goes on the input as well as the wrapper. The wrapper's
          // `focus-within` draws the pill, but the a11y focus walk in
          // apps/web/e2e asserts an indicator on the *focused element*, and
          // `outline-hidden` alone silently drops the forced-colors ring too.
          "focus-visible:outline-hidden focus-visible:[box-shadow:var(--focus-ring)]",
          // The UA's own clear affordance would sit next to ours.
          "rounded-sm bg-transparent text-sm [&::-webkit-search-cancel-button]:hidden",
          inputClassName,
        )}
      />
      {canClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="text-ink-muted hover:text-ink focus-visible:outline-hidden target-area inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <Icon name="x" size={12} strokeWidth={2.2} />
        </button>
      ) : null}
    </div>
  );
});
