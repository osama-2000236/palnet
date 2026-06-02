// packages/ui-web/src/index.ts
// Barrel for @baydar/ui-web. Re-exports every public component + its prop types.
// Keep alphabetical within sections.

export { cx } from "./cx";

// ── Layout primitives ────────────────────────────────────────────────
export { Surface } from "./layout";
export type { SurfaceProps, SurfaceVariant, SurfacePadding } from "./layout";

// ── Illustration & empty states ──────────────────────────────────────
export { Illustration, ILLUSTRATION_MOTIFS, ILLUSTRATION_DIRECTIONS } from "./Illustration";
export type {
  IllustrationProps,
  IllustrationMotif,
  IllustrationDirection,
  IllustrationSize,
  IllustrationTint,
} from "./Illustration";
export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";
export { OnboardingProgress } from "./OnboardingProgress";
export type { OnboardingProgressProps, OnboardingProgressStyle } from "./OnboardingProgress";

// ── Identity ─────────────────────────────────────────────────────────
export { Avatar } from "./Avatar";
export type { AvatarProps, AvatarSize, AvatarUser } from "./Avatar";
export { Icon } from "./Icon";
export type { IconProps, IconName } from "./Icon";

// ── Shell ────────────────────────────────────────────────────────────
export { AppShell } from "./AppShell";
export type { AppShellProps, AppShellRoute, AppShellLabels } from "./AppShell";

// ── Composition ──────────────────────────────────────────────────────
export { Composer } from "./Composer";
export type { ComposerProps, ComposerLabels, ComposerMedia } from "./Composer";
export { PostCard } from "./PostCard";
export type {
  PostCardProps,
  PostCardLabels,
  PostCardAuthor,
  PostCardMedia,
  PostCardCounts,
} from "./PostCard";
export { PostCardSkeleton } from "./PostCardSkeleton";
export { ProfileSkeleton } from "./ProfileSkeleton";
export { RoomListSkeleton } from "./RoomListSkeleton";
export { SearchResultSkeleton } from "./SearchResultSkeleton";
export { Table } from "./Table";
export type { TableProps } from "./Table";

// ── Messaging ────────────────────────────────────────────────────────
export { MessageBubble } from "./MessageBubble";
export type { MessageBubbleProps, MessageBubbleLabels, MessageStatus } from "./MessageBubble";
export { RoomRow } from "./RoomRow";
export type { RoomRowProps } from "./RoomRow";
export { TypingIndicator } from "./TypingIndicator";
export type { TypingIndicatorProps } from "./TypingIndicator";
export { groupMessages } from "./groupMessages";
export type { GroupedMessage, GroupMessagesOptions } from "./groupMessages";

// ── Atoms ────────────────────────────────────────────────────────────
export { Alert } from "./Alert";
export type { AlertProps, AlertKind } from "./Alert";
export { Banner } from "./Banner";
export type { BannerProps, BannerKind } from "./Banner";
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";
export { Chip } from "./Chip";
export type { ChipProps, ChipSize } from "./Chip";
export { Dialog } from "./Dialog";
export type { DialogProps } from "./Dialog";
export { Input } from "./Input";
export type { InputProps, InputSize } from "./Input";
export { RetryChip } from "./RetryChip";
export type { RetryChipProps } from "./RetryChip";
export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";
export { Tabs, Tab } from "./Tabs";
export type { TabsProps, TabProps } from "./Tabs";
export { Toast, ToastHost, ToastProvider, useToast } from "./Toast";
export type {
  ShowToastInput,
  ToastContextValue,
  ToastKind,
  ToastProps,
  ToastProviderProps,
} from "./Toast";
// ── Safety ───────────────────────────────────────────────────────────
export { ReportDialog, BlockButton, BlockedListItem } from "./safety";
export type {
  ReportDialogLabels,
  ReportDialogProps,
  ReportTarget,
  BlockButtonLabels,
  BlockButtonProps,
  BlockedListItemLabels,
  BlockedListItemProps,
} from "./safety";
