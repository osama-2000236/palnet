// MessageBubble — a single message in a thread.
// Spec: docs/components/MessageBubble.md, prototype MessagesPage.jsx.
// Mobile twin: packages/ui-native/src/MessageBubble.tsx (Sprint 5 — same prop API).
//
// Critical: we never fill own bubbles with `brand-600` (the CTA color). A thread
// of brand-600 bubbles reads as a wall of buttons and erodes CTA recognition.
// Own bubbles use `brand-100` + `brand-200` border instead.
//
// Grouping is decided by the parent (see `groupMessages` helper). This atom
// just renders `side` + `tail` + optional timestamp + optional status tick row.
//
// Tokens only. RTL-safe via logical corner radii (`end-end`, `end-start`).

import type { ReactNode } from "react";

import { cx } from "./cx";
import { Icon } from "./Icon";

/** Outgoing message delivery state. Used only on `side="mine"`. */
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface MessageBubbleLabels {
  /** Screen-reader prefix read before own-bubble content ("أنت، الساعة ٠٩:٤١:"). */
  ownPrefix(time: string): string;
  /** Screen-reader prefix for others ("{name}، الساعة ٠٩:٤١:"). */
  otherPrefix(name: string, time: string): string;
  /** Visible status text rendered after a failed send. */
  failedHint: string;
  /** `aria-label` for each status tick glyph. */
  statusSending: string;
  statusSent: string;
  statusDelivered: string;
  statusRead: string;
  statusFailed: string;
}

export interface MessageBubbleProps {
  side: "mine" | "theirs";
  /** Whether this bubble is the LAST of a run — controls the tail corner. */
  tail?: boolean;
  /** Pre-formatted timestamp. Omit on mid-run bubbles. */
  timestamp?: string | null;
  /** Only meaningful when `side="mine"`. Drives the tick glyph. */
  status?: MessageStatus;
  /** Author name for screen-reader prefix (theirs only). */
  authorName?: string;
  /** Click handler for failed bubbles (retry). */
  onRetry?(): void;
  labels: MessageBubbleLabels;
  children: ReactNode;
}

export function MessageBubble({
  side,
  tail = true,
  timestamp,
  status,
  authorName,
  onRetry,
  labels,
  children,
}: MessageBubbleProps): JSX.Element {
  const mine = side === "mine";

  const srPrefix =
    mine
      ? labels.ownPrefix(timestamp ?? "")
      : labels.otherPrefix(authorName ?? "", timestamp ?? "");

  return (
    <li
      className={cx(
        "flex max-w-[70%] flex-col",
        mine ? "items-end self-end" : "items-start self-start",
      )}
    >
      <div
        className={cx(
          "whitespace-pre-wrap break-words rounded-[14px] border px-3.5 py-2.5 text-sm leading-[1.6]",
          mine
            ? "bg-brand-100 border-brand-200 text-ink"
            : "bg-surface border-line-soft text-ink",
          // Tail — the only corner that goes tight (4px). Logical so it
          // flips correctly in RTL.
          tail && mine && "rounded-ee-[4px]",
          tail && !mine && "rounded-es-[4px]",
          status === "failed" && "border-danger/60",
        )}
      >
        <span className="sr-only">{srPrefix}</span>
        {children}
      </div>

      {timestamp || (mine && status) ? (
        <div
          className={cx(
            "mt-0.5 flex items-center gap-1 text-[11px]",
            mine ? "self-end text-ink-muted" : "self-start text-ink-muted",
          )}
        >
          {timestamp ? (
            <span dir="ltr" className="tabular-nums">
              {timestamp}
            </span>
          ) : null}
          {mine && status ? (
            <StatusTick
              status={status}
              labels={labels}
              onRetry={status === "failed" ? onRetry : undefined}
            />
          ) : null}
        </div>
      ) : null}

      {status === "failed" ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-0.5 text-[11px] text-danger hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          {labels.failedHint}
        </button>
      ) : null}
    </li>
  );
}

function StatusTick({
  status,
  labels,
  onRetry,
}: {
  status: MessageStatus;
  labels: MessageBubbleLabels;
  onRetry?: () => void;
}): JSX.Element {
  switch (status) {
    case "sending":
      return (
        <span
          aria-label={labels.statusSending}
          className="inline-flex items-center text-ink-muted"
        >
          <Icon name="clock" size={12} />
        </span>
      );
    case "sent":
      return (
        <span
          aria-label={labels.statusSent}
          className="inline-flex items-center text-ink-muted"
        >
          <Icon name="check" size={14} />
        </span>
      );
    case "delivered":
      return (
        <span
          aria-label={labels.statusDelivered}
          className="inline-flex items-center text-ink-muted"
        >
          <Icon name="check-double" size={14} />
        </span>
      );
    case "read":
      return (
        <span
          aria-label={labels.statusRead}
          className="inline-flex items-center text-brand-600"
        >
          <Icon name="check-double" size={14} />
        </span>
      );
    case "failed":
      return (
        <button
          type="button"
          onClick={onRetry}
          aria-label={labels.statusFailed}
          className="inline-flex items-center text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <Icon name="x" size={14} />
        </button>
      );
    default:
      return <span aria-hidden="true" />;
  }
}
