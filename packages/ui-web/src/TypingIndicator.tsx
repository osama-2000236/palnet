// TypingIndicator — 3-dot "theirs" bubble shown when the other user is typing.
// Spec: Sprint 4. Mobile twin: Sprint 5.
//
// Rendered inline inside the thread list (same `self-start` alignment as a
// theirs-bubble, no tail).

import { cx } from "./cx";

export interface TypingIndicatorProps {
  /** Accessible label, e.g. "{name} يكتب…". */
  label: string;
}

export function TypingIndicator({ label }: TypingIndicatorProps): JSX.Element {
  return (
    <li className="flex items-center self-start" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div
        aria-hidden="true"
        className={cx(
          "border-line-soft bg-surface inline-flex items-center gap-1 rounded-[14px] rounded-es-[4px] border px-3.5 py-2.5",
        )}
      >
        <Dot />
        <Dot className="[animation-delay:150ms]" />
        <Dot className="[animation-delay:300ms]" />
      </div>
    </li>
  );
}

function Dot({ className }: { className?: string }): JSX.Element {
  return (
    <span
      className={cx("bg-ink-muted inline-block h-1.5 w-1.5 animate-bounce rounded-full", className)}
    />
  );
}
