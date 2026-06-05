// Chip — the filter / facet / tag primitive. Spec:
// design-handoff-2026-05/MISSING-ELEMENTS.md §08.
//
// Replaces the inline `FilterChip` in jobs/page.tsx and the ad-hoc
// `bg-surface-subtle rounded-full ...` skill pills in JobListRow,
// PostCard, and the profile editor's skill display.
//
// Modes:
//   • Static (no onClick, no onRemove) — pure visual tag (skills, hashtags).
//     Renders as a <span>.
//   • Toggle  (onClick) — filter chip with active/inactive state. Renders
//     as a <button role="switch">.
//   • Removable (onRemove) — chip with an integrated close button. Used by
//     TagInput. The whole chip is still clickable if you also pass onClick.
//
// Rules:
//   • Keep labels SHORT (≤24 chars). Long labels truncate with title attr.
//   • `dot` adds a leading colored bullet (unread indicator, "hiring now").
//   • Disabled chips don't fire onClick, don't render the X button.

import type { JSX, KeyboardEvent, ReactNode } from "react";

import { cx } from "./cx";

export type ChipSize = "sm" | "md";

export interface ChipProps {
  children: ReactNode;
  size?: ChipSize;
  /** Active/selected state — for filter chips. Ignored when not interactive. */
  active?: boolean;
  /** Render a leading colored dot. Pass the Tailwind background class. */
  dotClassName?: string;
  /** Icon (or any node) shown before the label. Decorative — wrap in <Icon />. */
  leading?: ReactNode;
  /** When provided, the chip acts as a toggle button. */
  onClick?: () => void;
  /** When provided, the chip renders an internal close button. */
  onRemove?: () => void;
  /** Accessible label for the close button — REQUIRED when `onRemove` is set. */
  removeAriaLabel?: string;
  disabled?: boolean;
  /** Visually shows the chip without any interactive treatment. */
  className?: string;
  /** Override the title (tooltip) — defaults to the text content for truncation. */
  title?: string;
}

const SIZE_CLASSES: Record<ChipSize, string> = {
  sm: "h-6 px-2.5 text-[11px] gap-1",
  md: "h-7 px-3   text-[13px] gap-1.5",
};

const CLOSE_SIZE: Record<ChipSize, string> = {
  sm: "h-4 w-4 -me-1",
  md: "h-[18px] w-[18px] -me-1.5",
};

export function Chip({
  children,
  size = "md",
  active = false,
  dotClassName,
  leading,
  onClick,
  onRemove,
  removeAriaLabel,
  disabled = false,
  className,
  title,
}: ChipProps): JSX.Element {
  const interactive = Boolean(onClick) && !disabled;

  const baseClasses = cx(
    "inline-flex select-none items-center rounded-full border font-sans font-medium",
    "max-w-[24ch] truncate whitespace-nowrap",
    SIZE_CLASSES[size],
    active
      ? "border-brand-600 bg-brand-50 text-brand-700"
      : "border-line-hard bg-surface text-ink-muted",
    interactive && !active && "hover:bg-surface-subtle",
    interactive && active && "hover:bg-brand-100",
    interactive &&
      "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30",
    disabled && "cursor-not-allowed opacity-55",
    className,
  );

  const inner = (
    <>
      {dotClassName ? (
        <span
          aria-hidden="true"
          className={cx("h-1.5 w-1.5 shrink-0 rounded-full", dotClassName)}
        />
      ) : null}
      {leading ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {leading}
        </span>
      ) : null}
      <span
        className="truncate"
        title={title ?? (typeof children === "string" ? children : undefined)}
      >
        {children}
      </span>
      {onRemove && !disabled ? (
        <button
          type="button"
          aria-label={removeAriaLabel ?? "Remove"}
          onClick={(e) => {
            // Don't bubble the click into the chip's own onClick handler.
            e.stopPropagation();
            onRemove();
          }}
          className={cx(
            "inline-flex shrink-0 items-center justify-center rounded-full",
            "text-current/70 hover:bg-current/10 hover:text-current",
            "focus-visible:ring-brand-500/30 focus:outline-none focus-visible:ring-2",
            CLOSE_SIZE[size],
          )}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      ) : null}
    </>
  );

  // When `onClick` is provided we render a button. Removable-only chips remain
  // semantically a <span> with an interactive close button child — that's
  // correct: the chip itself isn't a toggle.
  if (interactive) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-disabled={disabled || undefined}
        onClick={onClick}
        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={baseClasses}
      >
        {inner}
      </button>
    );
  }

  return <span className={baseClasses}>{inner}</span>;
}
