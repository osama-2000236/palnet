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

import { useState } from "react";

import { Avatar } from "./Avatar";
import { cx } from "./cx";
import { Icon } from "./Icon";
import { Menu, type MenuItemSpec } from "./Menu";
import type { PostCardProps } from "./PostCard.types";
import { PostCardAction } from "./PostCardAction";
import { PostCardStats } from "./PostCardStats";
import { ProvenanceLine } from "./ProvenanceLine";
import { ReactionPicker } from "./ReactionPicker";
import { Surface } from "./Surface";

export type {
  PostCardAuthor,
  PostCardCounts,
  PostCardLabels,
  PostCardMedia,
  PostCardProps,
} from "./PostCard.types";

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
  context,
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
      {context ? (
        <div className="border-rule-hairline border-b px-4 py-1.5">
          <ProvenanceLine variant="inline" text={context} data-testid="post-context" />
        </div>
      ) : null}
      {/* Header */}
      <header className="flex items-start gap-3 px-4 pb-2.5 pt-3.5">
        <button
          type="button"
          onClick={() => author.id && onOpenProfile?.(author.id)}
          aria-label={labels.authorLabel}
          // `target-area`: the avatar is 40px and the name row is 20px tall, so
          // both were under the 44px minimum — the sweep never caught them
          // because no PostCard had ever been on the test user's feed until
          // `reactions.spec.ts` started seeding one.
          className="target-area focus-visible:outline-hidden shrink-0 rounded-full focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <Avatar user={author} size="md" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <button
            type="button"
            onClick={() => author.id && onOpenProfile?.(author.id)}
            className="bidi-plaintext target-area text-ink focus-visible:outline-hidden truncate text-start text-sm font-semibold hover:underline focus-visible:[box-shadow:var(--focus-ring)]"
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
        <div className="bidi-plaintext text-body text-ink whitespace-pre-wrap px-4 pb-3">
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
