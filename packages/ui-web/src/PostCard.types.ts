// PostCard prop types — split out of PostCard.tsx to keep that file under the
// qa:design 300-LOC ceiling, same split as the native twin.

import type { ReactNode } from "react";

import type { AvatarUser } from "./Avatar";
import type { MenuItemSpec } from "./Menu";
import type { ReactionPickerLabels } from "./ReactionPicker";
import type { ReactionKind } from "./reactions";

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
   * Why a ranked feed shows this post ("أعاد سامي نشر هذا"), drawn as a
   * provenance line above the author. Host-composed from i18n; omit it for
   * posts whose author already explains them.
   */
  context?: string;
  /**
   * When the viewer expands comments, the host mounts the Comments region
   * here. The button just toggles; the node decides what to render.
   */
  commentsSlot?: ReactNode;
  /** Controlled comments-open state. Falls back to internal state. */
  commentsOpen?: boolean;
  onToggleComments?(next: boolean): void;
}
