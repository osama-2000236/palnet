// Badge — the small labelled pill. Native twin: packages/ui-native/src/Badge.tsx.
//
// Before this existed the same pill was hand-written at least eight times with
// eight different recipes: the nav count (`h-4 min-w-4 … text-micro font-bold`),
// RoomRow's unread (`h-5 min-w-[20px] … font-semibold`), the Tab count
// (`px-1.5 py-0.5 … leading-none`), and the status pills on `/settings/account`,
// `/settings/security` and the jobs list. They disagreed on height, weight and
// radius, which is why two unread counts never looked like the same object.
//
// Two jobs, one component:
//   • `count` — a number the host has already localised. Renders circular at
//     small values, pill once it grows. This is the accent-toned one.
//   • label  — a short status word ("تم التقديم", "موثّق"), tinted by `tone`.
//
// Rules:
//   • The host formats the number. This component never calls Intl — ui-web is
//     framework- and locale-neutral by contract (A1.6).
//   • A badge is decorative by default: it carries `aria-hidden` unless given a
//     `srLabel`, because "٣" read aloud on its own tells a screen-reader user
//     nothing. The host supplies "٣ رسائل غير مقروءة".

import type { JSX, ReactNode } from "react";

import { cx } from "./cx";

export type BadgeTone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Leading status dot, in the tone's own colour. */
  dot?: boolean;
  /**
   * Spoken name. Omit and the badge is `aria-hidden` — correct for a count that
   * duplicates a label already in the accessible name of its parent control.
   */
  srLabel?: string;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-subtle text-ink-muted",
  brand: "bg-brand-50 text-brand-700",
  accent: "bg-accent-600 text-ink-inverse",
  success: "bg-[var(--success-soft)] text-success",
  warning: "bg-[var(--warning-soft)] text-warning",
  danger: "bg-[var(--danger-soft)] text-danger",
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-ink-subtle",
  brand: "bg-brand-600",
  accent: "bg-ink-inverse",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

// `min-w` equals the height so a one-character badge is a circle and a
// three-character one grows into a pill without the glyph touching the edge.
const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "h-4 min-w-4 px-1 text-micro font-bold",
  md: "h-5 min-w-5 px-1.5 text-micro font-semibold",
};

export function Badge({
  children,
  tone = "neutral",
  size = "md",
  dot = false,
  srLabel,
  className,
}: BadgeProps): JSX.Element {
  return (
    <>
      <span
        aria-hidden="true"
        className={cx(
          "inline-flex select-none items-center justify-center gap-1 rounded-full leading-none",
          SIZE_CLASSES[size],
          TONE_CLASSES[tone],
          className,
        )}
      >
        {dot ? (
          <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", DOT_CLASSES[tone])} />
        ) : null}
        <span className="truncate">{children}</span>
      </span>
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
    </>
  );
}
