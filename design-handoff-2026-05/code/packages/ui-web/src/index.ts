// packages/ui-web/src/index.ts
// Barrel for @baydar/ui-web. Re-exports every public component + its prop types.
// Keep alphabetical within sections.

export { cx } from "./cx";

// ── Layout primitives ────────────────────────────────────────────────
export { Surface } from "./Surface";
export type { SurfaceProps, SurfaceVariant, SurfacePadding } from "./Surface";

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
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";
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

// NEW (May 2026 sprint) — see design-handoff-2026-05/MISSING-ELEMENTS.html
export { Input } from "./Input";
export type { InputProps, InputSize } from "./Input";
export { Chip } from "./Chip";
export type { ChipProps, ChipVariant } from "./Chip";
export { Alert } from "./Alert";
export type { AlertProps, AlertKind } from "./Alert";

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
