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
import { Icon } from "./Icon";
import { Menu, type MenuItemSpec } from "./Menu";
import { PostCardAction } from "./PostCardAction";
import { PostCardStats } from "./PostCardStats";
import { ReactionPicker, type ReactionPickerLabels } from "./ReactionPicker";
import type { ReactionKind } from "./reactions";
import { Surface } from "./Surface";

export interface PostCardAuthor extends AvatarUser {
  headline?: string | null;
}

export interface PostCardMedia {
  id?: string | null;
  url: string;
  kind: "IMAGE" | "VIDEO";
}

export interface PostCardCounts {
  reactions: number;
  comments: number;
  reposts: number;
  /** Per-type breakdown, e.g. `{ LIKE: 4, INSIGHTFUL: 1 }`. Absent → no glyph row. */
  byReaction?: Partial<Record<ReactionKind, number>>;
}

export interface PostCardLabels {
  /** Per-reaction names + the flyout's accessible name. */
  reactions: ReactionPickerLabels;
  comment: string;
  repost: string;
  /** e.g. "أعدت النشر" — active state of the repost button. */
  reposted?: string;
  save?: string;
  saved?: string;
  /** "{n} تعليق" — interpolated count label. */
  commentsCount(n: number): string;
  /** "{n} إعادة نشر" — interpolated count label. */
  repostsCount(n: number): string;
  /** Accessible name for the profile link (often full name). */
  authorLabel: string;
  /** Accessible name for the overflow menu button. */
  moreOptions: string;
  /** Visible/action label for reporting this post. */
  report?: string;
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
  /**
   * The viewer's reaction, or null. Was `liked: boolean` — which is what threw
   * away five of the six types the API has always accepted.
   */
  reaction: ReactionKind | null;
  /** Disable the like button while a request is in flight. */
  busy?: boolean;
  /** Whether the viewer has reposted this post. */
  reposted?: boolean;
  /** Disable the repost button while a request is in flight. */
  repostBusy?: boolean;
  /** Whether the viewer has saved/bookmarked this post. */
  saved?: boolean;
  /** Disable the save button while a request is in flight. */
  saveBusy?: boolean;
  labels: PostCardLabels;

  /** Click the author name/avatar — host routes to the profile page. */
  onOpenProfile?(authorId: string): void;
  /** Set or clear the viewer's reaction — host performs the call + reconcile. */
  onSetReaction?(next: ReactionKind | null): void;
  /** Toggle repost — host performs the API call + optimistic update.
   *  Omit it and the button is not rendered, same rule as save: a post has no
   *  public permalink, so an external "share" action has nowhere to point. */
  onToggleRepost?(): void;
  /** Toggle save/bookmark. */
  onToggleSave?(): void;
  onReport?(): void;
  /** Extra items appended to the overflow menu (copy link, unfollow, …). */
  menuItems?: MenuItemSpec[];
  /** Formats a count for display. Injected — ui-web never calls Intl itself. */
  formatCount?(value: number): string;
  /**
   * When the viewer expands comments, the host mounts the Comments region
   * here. The button just toggles; the node decides what to render.
   */
  commentsSlot?: ReactNode;
  /** Controlled comments-open state. Falls back to internal state. */
  commentsOpen?: boolean;
  onToggleComments?(next: boolean): void;
}

export function PostCard({
  id: _id,
  author,
  body,
  media = [],
  timestamp,
  counts,
  reaction,
  busy = false,
  reposted = false,
  repostBusy = false,
  saved = false,
  saveBusy = false,
  labels,
  onOpenProfile,
  onSetReaction,
  onToggleRepost,
  onToggleSave,
  onReport,
  menuItems,
  formatCount = String,
  commentsSlot,
  commentsOpen,
  onToggleComments,
}: PostCardProps): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = commentsOpen ?? internalOpen;
  const toggleComments = (): void => {
    const next = !open;
    if (onToggleComments) onToggleComments(next);
    else setInternalOpen(next);
  };

  // The overflow control was labelled `moreOptions` and wired straight to
  // `onReport` — a menu affordance whose only outcome was reporting the post.
  // It is a real menu now, and it renders nothing when there is nothing in it.
  const overflow: MenuItemSpec[] = [
    ...(menuItems ?? []),
    ...(onReport && labels.report
      ? [
          {
            id: "report",
            label: labels.report,
            icon: "x" as const,
            destructive: true,
            onSelect: onReport,
          },
        ]
      : []),
  ];

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
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <Avatar user={author} size="md" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <button
            type="button"
            onClick={() => author.id && onOpenProfile?.(author.id)}
            className="bidi-plaintext text-ink truncate text-start text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            {name}
          </button>
          {author.headline ? (
            <span className="bidi-plaintext text-ink-muted truncate text-xs">
              {author.headline}
            </span>
          ) : null}
          <span className="text-ink-muted text-xs">
            <span dir="ltr" className="tabular-nums">
              {timestamp}
            </span>
            {" · "}
            {labels.publicAudience}
          </span>
        </div>
        {overflow.length > 0 ? (
          <Menu label={labels.moreOptions} items={overflow} className="shrink-0" />
        ) : null}
      </header>

      {/* Body */}
      {body ? (
        <div className="bidi-plaintext text-ink text-body whitespace-pre-wrap px-4 pb-3">
          {body}
        </div>
      ) : null}

      {/* Media */}
      {media.length > 0 ? (
        <ul className={cx("grid gap-0.5", media.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {media.map((m, i) => (
            <li key={m.id ?? m.url ?? i} className="relative">
              {m.kind === "IMAGE" ? (
                <img src={m.url} alt="" className="max-h-[420px] w-full object-cover" />
              ) : (
                <div className="bg-surface-subtle text-ink-muted flex aspect-video w-full items-center justify-center">
                  <Icon name="video" size={32} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <PostCardStats counts={counts} labels={labels} formatCount={formatCount} />

      <div className="border-line-soft border-t" />

      {/* Action bar.
          Grid, not flex. With `flex-1` the four cells did not come out equal:
          the reaction cell measured 71px against 87px for the other three at
          390px, because it is a positioned wrapper (the picker flyout needs an
          anchor) rather than the bare <button> the others are, and the two
          resolve their base size differently even with identical
          `flex:1 1 0%; min-width:0`. `auto-cols-fr` makes every cell exactly
          1fr whatever it contains and whatever the action count is — and the
          count does vary, since repost and save only render when the host wires
          a handler. */}
      <div className="grid auto-cols-fr grid-flow-col items-stretch p-1">
        <ReactionPicker
          reaction={reaction}
          labels={labels.reactions}
          onSelect={(next) => onSetReaction?.(next)}
          disabled={busy}
        />
        <PostCardAction
          icon="comment"
          label={labels.comment}
          onClick={toggleComments}
          active={open}
        />
        {onToggleRepost ? (
          <PostCardAction
            icon="repost"
            label={reposted ? (labels.reposted ?? labels.repost) : labels.repost}
            onClick={onToggleRepost}
            active={reposted}
            disabled={repostBusy}
          />
        ) : null}
        {onToggleSave && labels.save ? (
          <PostCardAction
            icon="bookmark"
            label={saved ? (labels.saved ?? labels.save) : labels.save}
            onClick={onToggleSave}
            active={saved}
            disabled={saveBusy}
          />
        ) : null}
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
