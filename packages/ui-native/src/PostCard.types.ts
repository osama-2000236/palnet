// PostCard prop types — split out to mirror Icon.types.ts and keep
// PostCard.tsx under the qa:design LOC ceiling.

import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { AvatarUser } from "./Avatar";
import type { IconName } from "./Icon";
import type { ReactionKind } from "./reactions";

export interface PostCardAction {
  key: string;
  label: string;
  /** Ignored when `glyph` is provided. */
  icon: IconName;
  /**
   * Replaces the icon. The reaction action needs one of six glyphs that are not
   * in the chrome icon set, and the host is the only thing that knows which.
   */
  glyph?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  onPress?: () => void;
  /**
   * Touch's equivalent of the web picker's hover-dwell: long-press the reaction
   * action to open the full set. Web opens on dwell/focus; see ReactionPicker.
   */
  onLongPress?: () => void;
  accessibilityHint?: string;
}

export interface PostCardProps {
  author: AvatarUser;
  authorName: string;
  authorHeadline?: string | null;
  timestamp?: string | null;
  body: string;
  media?: ReactNode;
  // number | string so callers can pass locale-formatted digits (Arabic-Indic).
  reactionCount?: number | string;
  /**
   * Which reactions the post actually received, most-used first. The stats pip
   * used to be a hard-coded thumb regardless of what people sent. Empty or
   * omitted falls back to the generic mark.
   */
  reactionKinds?: readonly ReactionKind[];
  commentCount?: number | string;
  repostCount?: number | string;
  actions: PostCardAction[];
  comments?: ReactNode;
  onAuthorPress?: () => void;
  authorAccessibilityLabel?: string;
  /** Overflow menu in the header (report/hide/…). Mirrors web's `onReport`.
   *  Omit it and the header renders no glyph — never a dead affordance. */
  onMorePress?: () => void;
  moreAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
