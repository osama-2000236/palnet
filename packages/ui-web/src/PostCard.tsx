// PostCard — the feed post, shared shell.
// Spec: docs/components/PostCard.md, prototype components/FeedPage.jsx (PostCard).
// Mobile twin: packages/ui-native/src/PostCard.tsx (Sprint 5 — same prop API).
//
// Responsibility split:
//   • This file owns the visual shell: header, body, media grid, stats row,
//     4-button action bar, and the expanded-comments slot.
//   • The host (apps/web/src/components/PostCard.tsx) owns the network
//     concerns (reaction API call + optimistic reconcile) and injects the
//     Comments region as `commentsSlot` when expanded.
//
// Tokens only. RTL-safe (logical spacing). No hardcoded hex.

"use client";

import { useState, type ReactNode } from "react";

import { Avatar, type AvatarUser } from "./Avatar";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import { Image } from "./Image";
import { Surface } from "./Surface";

export interface PostCardAuthor extends AvatarUser {
  headline?: string | null;
}

export interface PostCardMedia {
  id?: string | null;
  url: string;
  kind: "IMAGE" | "VIDEO";
  blurhash?: string | null;
}

export interface PostCardCounts {
  reactions: number;
  comments: number;
  reposts: number;
}

export interface PostCardLabels {
  /** e.g. "إعجاب" — resting state of the like button. */
  like: string;
  /** e.g. "أعجبني" — active state of the like button. */
  liked: string;
  comment: string;
  repost: string;
  send: string;
  /** "{n} تعليق" — interpolated count label. */
  commentsCount(n: number): string;
  /** "{n} إعادة نشر" — interpolated count label. */
  repostsCount(n: number): string;
  /** Accessible name for the profile link (often full name). */
  authorLabel: string;
  /** Accessible name for the overflow menu button. */
  moreOptions: string;
  /** e.g. "منشور عام" — audience line under the timestamp. */
  publicAudience: string;
}

export interface PostCardProps {
  id: string;
  author: PostCardAuthor;
  body: string;
  media?: PostCardMedia[];
  /** Pre-formatted timestamp (host decides locale + relative vs absolute). */
  timestamp: string;
  counts: PostCardCounts;
  /** Whether the viewer has reacted (any reaction type counts as liked). */
  liked: boolean;
  /** Disable the like button while a request is in flight. */
  busy?: boolean;
  labels: PostCardLabels;

  /** Click the author name/avatar — host routes to the profile page. */
  onOpenProfile?(authorId: string): void;
  /** Toggle reaction — host performs the API call + optimistic update. */
  onToggleReaction?(): void;
  /** Repost action. Host can open a composer or navigate. */
  onRepost?(): void;
  /** Share action. */
  onShare?(): void;
  /**
   * When the viewer expands comments, the host mounts the Comments region
   * here. The button just toggles; the node decides what to render.
   */
  commentsSlot?: ReactNode;
  /** Controlled comments-open state. Falls back to internal state. */
  commentsOpen?: boolean;
  onToggleComments?(next: boolean): void;
  /**
   * Overflow menu. When provided, replaces the default "⋯" icon button in
   * the header — hosts mount their own menu component (Report/Block/…)
   * so business logic stays out of ui-web.
   */
  moreMenu?: ReactNode;
}

export function PostCard({
  id: _id,
  author,
  body,
  media = [],
  timestamp,
  counts,
  liked,
  busy = false,
  labels,
  onOpenProfile,
  onToggleReaction,
  onRepost,
  onShare,
  commentsSlot,
  commentsOpen,
  onToggleComments,
  moreMenu,
}: PostCardProps): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = commentsOpen ?? internalOpen;
  const toggleComments = (): void => {
    const next = !open;
    if (onToggleComments) onToggleComments(next);
    else setInternalOpen(next);
  };

  const name =
    `${author.firstName ?? ""} ${author.lastName ?? ""}`.trim() ||
    author.handle ||
    labels.authorLabel;

  return (
    <Surface as="article" variant="card" padding="0" className="overflow-hidden">
      {/* Header */}
      <header className="flex items-start gap-3 px-4 pb-2.5 pt-3.5">
        <button
          type="button"
          onClick={() => author.id && onOpenProfile?.(author.id)}
          aria-label={labels.authorLabel}
          className="focus-visible:ring-brand-600 focus-visible:ring-offset-surface shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <Avatar user={author} size="md" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <button
            type="button"
            onClick={() => author.id && onOpenProfile?.(author.id)}
            className="text-ink focus-visible:ring-brand-600 truncate text-start text-sm font-semibold hover:underline focus:outline-none focus-visible:ring-2"
          >
            {name}
          </button>
          {author.headline ? (
            <span className="text-ink-muted truncate text-xs">{author.headline}</span>
          ) : null}
          <span className="text-ink-muted text-xs">
            <span dir="ltr" className="tabular-nums">
              {timestamp}
            </span>
            {" · "}
            {labels.publicAudience}
          </span>
        </div>
        {moreMenu ?? (
          <button
            type="button"
            aria-label={labels.moreOptions}
            className="text-ink-muted hover:bg-surface-subtle hover:text-ink focus-visible:ring-brand-600 inline-flex h-8 w-8 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2"
          >
            <Icon name="more" size={18} />
          </button>
        )}
      </header>

      {/* Body */}
      {body ? (
        <div className="text-ink text-body whitespace-pre-wrap px-4 pb-3 leading-[1.7]">{body}</div>
      ) : null}

      {/* Media */}
      {media.length > 0 ? (
        <ul className={cx("grid gap-0.5", media.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {media.map((m, i) => (
            <li key={m.id ?? m.url ?? i} className="relative">
              {m.kind === "IMAGE" ? (
                <Image
                  src={m.url}
                  alt=""
                  blurhash={m.blurhash ?? null}
                  wrapperClassName="max-h-media w-full"
                  className="max-h-media w-full object-cover"
                />
              ) : (
                <div className="bg-surface-subtle text-ink-muted flex aspect-video w-full items-center justify-center">
                  <Icon name="video" size={32} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Stats row */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span
          aria-hidden="true"
          className="bg-brand-600 text-ink-inverse h-badge w-badge inline-flex items-center justify-center rounded-full"
        >
          <Icon name="thumb" size={10} strokeWidth={2.4} />
        </span>
        <span aria-live="polite" className="text-ink-muted text-xs tabular-nums">
          {counts.reactions}
        </span>
        <div className="flex-1" />
        <span className="text-ink-muted text-xs">
          {labels.commentsCount(counts.comments)}
          {" · "}
          {labels.repostsCount(counts.reposts)}
        </span>
      </div>

      <div className="border-line-soft border-t" />

      {/* Action bar */}
      <div className="flex items-stretch p-1">
        <ActionButton
          icon="thumb"
          label={liked ? labels.liked : labels.like}
          onClick={onToggleReaction}
          active={liked}
          disabled={busy}
        />
        <ActionButton
          icon="comment"
          label={labels.comment}
          onClick={toggleComments}
          active={open}
        />
        <ActionButton icon="repost" label={labels.repost} onClick={onRepost} />
        <ActionButton icon="send-paper" label={labels.send} onClick={onShare} />
      </div>

      {open && commentsSlot ? (
        <div
          role="region"
          aria-label={labels.comment}
          className="border-line-soft bg-surface-subtle border-t px-4 pb-3.5 pt-1"
        >
          {commentsSlot}
        </div>
      ) : null}
    </Surface>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cx(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-2.5 text-sm font-medium transition-colors",
        "hover:bg-surface-subtle focus-visible:ring-brand-600 focus-visible:ring-offset-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        active ? "text-brand-700 font-semibold" : "text-ink-muted hover:text-ink",
      )}
    >
      <Icon name={icon} size={18} />
      {label}
    </button>
  );
}
