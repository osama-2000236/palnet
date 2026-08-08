// OutboxTray — «لم تُرسل». The writes that did not get through.
//
// Nothing in the outbox is ever dropped silently, which is only true if there
// is somewhere to see it. A post that vanished is indistinguishable from a
// product that lost it, and on a 2G connection that will happen often enough
// that the difference matters.
//
// Shows only what needs a decision. A queued entry is the product working and
// does not deserve a panel; a failed one is a member's words sitting on their
// phone, and they get to choose whether to send them again or let them go.

import type { JSX } from "react";

import { Button } from "./Button";
import { Surface } from "./Surface";
import { cx } from "./cx";

export type OutboxTrayState = "queued" | "sending" | "failed";

export interface OutboxTrayEntry {
  id: string;
  /** POST | MESSAGE | APPLICATION | WORK_PROOF_CONFIRM. */
  kind: string;
  state: OutboxTrayState;
  /** One line of what the member's copy is, for a row they can recognise. */
  preview?: string;
}

export interface OutboxTrayLabels {
  title: string;
  /** Keyed by kind, so a row says "منشور" rather than "POST". */
  kinds: Record<string, string>;
  queued: string;
  retry: string;
  discard: string;
}

export interface OutboxTrayProps {
  entries: OutboxTrayEntry[];
  labels: OutboxTrayLabels;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
  className?: string;
}

export function OutboxTray({
  entries,
  labels,
  onRetry,
  onDiscard,
  className,
}: OutboxTrayProps): JSX.Element | null {
  const failed = entries.filter((entry) => entry.state === "failed");
  const pending = entries.length - failed.length;

  // Nothing to decide, nothing to show. An empty state here would be a panel
  // announcing that the product works.
  if (failed.length === 0 && pending === 0) return null;

  return (
    <Surface variant="tinted" padding="4" className={cx("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-h3 text-ink font-semibold">{labels.title}</h2>
        {pending > 0 ? <span className="text-small text-ink-muted">{labels.queued}</span> : null}
      </div>

      {failed.length > 0 ? (
        <ul className="space-y-2">
          {failed.map((entry) => (
            <li
              key={entry.id}
              className="border-line-soft bg-surface flex flex-wrap items-center gap-2 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-small text-ink-muted">
                  {labels.kinds[entry.kind] ?? entry.kind}
                </p>
                {entry.preview ? (
                  <p className="text-body text-ink line-clamp-2">{entry.preview}</p>
                ) : null}
              </div>
              <Button size="sm" variant="secondary" onClick={() => onRetry(entry.id)}>
                {labels.retry}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDiscard(entry.id)}>
                {labels.discard}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Surface>
  );
}
