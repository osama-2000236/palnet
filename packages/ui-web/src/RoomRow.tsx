// RoomRow — one entry in the Messages left-rail list.
// Spec: prototype MessagesPage.jsx (room list). Mobile twin: Sprint 5.
//
// Visual: avatar with online dot, name, truncated last-message preview,
// relative timestamp, optional unread badge. Active row has `brand-50`
// background + a 3px `brand-600` indicator on the start edge.
//
// Tokens only. RTL-safe via `border-s-*`.

import { Avatar, type AvatarUser } from "./Avatar";
import { cx } from "./cx";

export interface RoomRowProps {
  user: AvatarUser;
  /** Truncated single-line preview of the last message. */
  preview: string;
  /** Short relative timestamp, e.g. "الآن" or "9:41". */
  timestamp: string;
  unreadCount?: number;
  online?: boolean;
  active?: boolean;
  onClick(): void;
  /** Accessible label override — defaults to the user's full name. */
  ariaLabel?: string;
}

export function RoomRow({
  user,
  preview,
  timestamp,
  unreadCount = 0,
  online = false,
  active = false,
  onClick,
  ariaLabel,
}: RoomRowProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      aria-label={ariaLabel}
      className={cx(
        "flex w-full items-center gap-3 border-b border-line-soft px-4 py-3 text-start transition-colors",
        "border-s-[3px]",
        active
          ? "border-s-brand-600 bg-brand-50"
          : "border-s-transparent hover:bg-surface-subtle",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-inset",
      )}
    >
      <Avatar user={user} size="md" online={online} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-ink">
            {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
              user.handle ||
              ""}
          </span>
          <span className="shrink-0 text-[11px] text-ink-muted tabular-nums">
            {timestamp}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cx(
              "truncate text-xs",
              unreadCount > 0 ? "font-semibold text-ink" : "text-ink-muted",
            )}
          >
            {preview}
          </span>
          {unreadCount > 0 ? (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-600 px-1.5 text-[11px] font-semibold text-ink-inverse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
