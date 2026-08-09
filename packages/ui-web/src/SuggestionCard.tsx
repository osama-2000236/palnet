// SuggestionCard — a person, and why they are on screen.
//
// The reason line is the whole difference between this and the list it
// replaces. FEED-RANKING.md's rule generalises: if the product cannot say why
// it is showing somebody, it does not show them — so `reason` is required, not
// optional, and a candidate without one never reaches this component.
//
// Dismissal is first-class for the same reason. A suggestion list that ignores
// "not this person" teaches the member that the control does nothing.

import type { JSX, ReactNode } from "react";

import { Avatar, type AvatarUser } from "./Avatar";
import { Surface } from "./Surface";
import { cx } from "./cx";

export interface SuggestionCardLabels {
  /** «لا تقترح هذا الشخص» — the dismiss control's spoken name. */
  dismiss: string;
}

export interface SuggestionCardProps {
  user: AvatarUser;
  name: string;
  headline?: string | null;
  /** Already-formatted, e.g. «٤ معارف مشتركين» or «خرّيجو جامعة النجاح». */
  reason: string;
  /** The degree chip and the follow button, supplied by the host. */
  actions?: ReactNode;
  degree?: ReactNode;
  onOpen?: () => void;
  onDismiss?: () => void;
  labels: SuggestionCardLabels;
  className?: string;
}

export function SuggestionCard({
  user,
  name,
  headline,
  reason,
  actions,
  degree,
  onOpen,
  onDismiss,
  labels,
  className,
}: SuggestionCardProps): JSX.Element {
  return (
    <Surface variant="row" padding="4" className={cx("flex items-start gap-3", className)}>
      <Avatar user={user} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className="text-ink focus-visible:outline-hidden truncate text-start font-semibold hover:underline focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {name}
            </button>
          ) : (
            <span className="text-ink truncate font-semibold">{name}</span>
          )}
          {degree}
        </div>
        {headline ? <p className="text-ink-muted text-small truncate">{headline}</p> : null}
        {/* The reason, always. This is the line that justifies the card. */}
        <p className="text-ink-subtle text-small">{reason}</p>
        {actions ? <div className="mt-2 flex items-center gap-2">{actions}</div> : null}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={labels.dismiss}
          className="target-area text-ink-subtle hover:text-ink focus-visible:outline-hidden shrink-0 rounded-md focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <svg
            width="16"
            height="16"
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
    </Surface>
  );
}
