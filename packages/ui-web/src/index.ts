// packages/ui-web/src/index.ts
// Barrel for @baydar/ui-web. Re-exports every public component + its prop types.
// Keep alphabetical within sections.

export { cx } from "./cx";
export { staggerDelay } from "./useStagger";

// ── Layout primitives ────────────────────────────────────────────────
export { Surface } from "./Surface";
export type { SurfaceProps, SurfaceVariant, SurfacePadding } from "./Surface";

// ── Illustration & empty states ──────────────────────────────────────
// The motif/direction tuples are barrel-public on purpose: the design-sync
// previews import them from "@baydar/ui-web" to render the motif catalogue,
// and that harness sees nothing but this barrel. Audit 9 cut them as unused
// because the scan covered apps/ and the kits only — check
// .design-sync/previews/ before cutting a barrel line.
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
export { ProfileHeader } from "./ProfileHeader";
export type { ProfileHeaderProps } from "./ProfileHeader";
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
export { ReactionGlyph } from "./ReactionGlyph";
export type { ReactionGlyphProps } from "./ReactionGlyph";
export { ReactionPicker } from "./ReactionPicker";
export type { ReactionPickerProps, ReactionPickerLabels } from "./ReactionPicker";
export { REACTION_TYPES, topReactions } from "./reactions";
export type { ReactionKind } from "./reactions";
export { AppBand } from "./AppBand";
export type { AppBandProps } from "./AppBand";
export { ProvenanceLine } from "./ProvenanceLine";
export type { ProvenanceLineProps } from "./ProvenanceLine";
export { ScoreBar } from "./ScoreBar";
export type {
  ScoreBarProps,
  ScoreBarDisplay,
  ScoreBarSegment,
  ScoreBarSize,
  ScoreBarTone,
} from "./ScoreBar";
export { StepRail } from "./StepRail";
export type { StepRailProps, StepRailStep } from "./StepRail";
export { RecordCard } from "./RecordCard";
export type { RecordCardProps } from "./RecordCard";
export { RecordCardSkeleton } from "./RecordCardSkeleton";
export type { RecordCardSkeletonProps } from "./RecordCardSkeleton";

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
export { Badge } from "./Badge";
export type { BadgeProps, BadgeSize, BadgeTone } from "./Badge";
export { Banner } from "./Banner";
export type { BannerProps, BannerKind } from "./Banner";
export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";
export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";
export { Chip } from "./Chip";
export type { ChipProps, ChipSize } from "./Chip";
export { Dialog } from "./Dialog";
export type { DialogProps } from "./Dialog";
export { Input } from "./Input";
export type { InputProps, InputSize } from "./Input";
export { Menu } from "./Menu";
export type { MenuProps, MenuItemSpec } from "./Menu";
export { RadioGroup } from "./RadioGroup";
export type { RadioGroupItem, RadioGroupProps } from "./RadioGroup";
export { RetryChip } from "./RetryChip";
export type { RetryChipProps } from "./RetryChip";
export { SearchField } from "./SearchField";
export type { SearchFieldProps } from "./SearchField";
export { Skeleton } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";
export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";
export { SwitchRow } from "./SwitchRow";
export type { SwitchRowProps } from "./SwitchRow";
export { Textarea } from "./Textarea";
export type { TextareaProps, TextareaSize } from "./Textarea";
export { Tabs, Tab } from "./Tabs";
export type { TabsProps, TabProps } from "./Tabs";
// `Toast` is the presentational pill; apps use `useToast`, but the design-sync
// Toast card renders it directly. Same reason as ILLUSTRATION_MOTIFS above.
export { Toast, ToastProvider, useToast } from "./Toast";
export type {
  ShowToastInput,
  ToastAction,
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
