// PostCard prop types — split out to mirror Icon.types.ts and keep
// PostCard.tsx under the qa:design LOC ceiling.

import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { AvatarUser } from "./Avatar";
import type { IconName } from "./Icon";

export interface PostCardAction {
  key: string;
  label: string;
  icon: IconName;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  onPress?: () => void;
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
