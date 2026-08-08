import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { makeSafetyStyles } from "./safety.styles";
import { Sheet } from "./Sheet";
import { Surface } from "./Surface";
import { useThemeTokens } from "./ThemeProvider";

// Restated rather than imported: ui-native is framework- and app-neutral and
// does not depend on @baydar/shared. `useReportLabels` types its bundle off
// this union, so a value added there and missed here fails type-check at the app.
export type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "HATE"
  | "MISINFORMATION"
  | "NUDITY"
  | "VIOLENCE"
  | "FEE_REQUEST"
  | "GHOST_JOB"
  | "ID_REQUEST"
  | "OTHER";

export interface BlockedUserDTO {
  id: string;
  blockedUserId: string;
  blockedHandle: string;
  blockedDisplayName: string;
  blockedAvatarUrl: string | null;
  createdAt: string;
}

export type ReportTarget =
  | { kind: "user"; id: string }
  | { kind: "post"; id: string }
  | { kind: "comment"; id: string }
  | { kind: "message"; id: string };

export interface ReportSheetLabels {
  title: string;
  detailsLabel: string;
  cancel: string;
  submit: string;
  close: string;
  reasons: Record<ReportReason, string>;
}

export interface ReportSheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  target: ReportTarget;
  onSubmit(input: { target: ReportTarget; reason: ReportReason; details?: string }): void;
  labels: ReportSheetLabels;
  submitting?: boolean;
  /**
   * Reason selected when the sheet opens. Lets a surface that already knows
   * what is being reported — the never-pay banner's one-tap path — skip the
   * step where the user finds the right radio.
   */
  initialReason?: ReportReason;
}

// Hiring fraud sits at the top: it is the report this product exists to make
// easy, and a reason nobody scrolls to is a reason nobody files. OTHER stays
// last so the escape hatch is not the first thing offered.
const REASONS = [
  "FEE_REQUEST",
  "GHOST_JOB",
  "ID_REQUEST",
  "SPAM",
  "HARASSMENT",
  "HATE",
  "MISINFORMATION",
  "NUDITY",
  "VIOLENCE",
  "OTHER",
] as const;

export function ReportSheet({
  open,
  onOpenChange,
  target,
  onSubmit,
  labels,
  submitting = false,
  initialReason = "FEE_REQUEST",
}: ReportSheetProps): JSX.Element {
  const [reason, setReason] = useState<ReportReason>(initialReason);
  const [details, setDetails] = useState("");

  // Reset on open, adjusted during render rather than in an effect (the repo
  // lints `react-hooks/set-state-in-effect`). Call sites that keep this mounted
  // with `open={false}` would otherwise reopen holding the last reason and the
  // last details text.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason(initialReason);
      setDetails("");
    }
  }
  const c = useThemeTokens().color;
  const styles = useMemo(() => makeSafetyStyles(c), [c]);

  return (
    <Sheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={labels.title}
      closeLabel={labels.close}
    >
      <View style={styles.reasonList}>
        {REASONS.map((item) => (
          <Pressable
            key={item}
            onPress={() => setReason(item)}
            accessibilityRole="radio"
            accessibilityState={{ checked: item === reason }}
            accessibilityLabel={labels.reasons[item]}
            style={({ pressed }) => [
              styles.reasonRow,
              item === reason ? styles.reasonRowSelected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={[styles.radio, item === reason ? styles.radioSelected : null]} />
            <Text style={[styles.reasonText, item === reason ? styles.reasonTextSelected : null]}>
              {labels.reasons[item]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{labels.detailsLabel}</Text>
      <TextInput
        accessibilityLabel={labels.detailsLabel}
        autoFocus={open}
        value={details}
        onChangeText={setDetails}
        maxLength={2000}
        multiline
        textAlignVertical="top"
        style={styles.detailsInput}
      />

      <View style={styles.actions}>
        <Button variant="secondary" onPress={() => onOpenChange(false)} disabled={submitting}>
          {labels.cancel}
        </Button>
        <Button
          loading={submitting}
          onPress={() => onSubmit({ target, reason, details: details.trim() || undefined })}
        >
          {labels.submit}
        </Button>
      </View>
    </Sheet>
  );
}

export interface BlockButtonLabels {
  block: string;
  unblock: string;
  confirmTitle: string;
  confirmBody: string;
  confirmCta: string;
  cancel: string;
}

export interface BlockButtonProps {
  userId: string;
  isBlocked: boolean;
  onChange(next: boolean, userId: string): void;
  labels: BlockButtonLabels;
  variant?: "block" | "unblock";
  loading?: boolean;
}

export function BlockButton({
  userId,
  isBlocked,
  onChange,
  labels,
  variant = isBlocked ? "unblock" : "block",
  loading = false,
}: BlockButtonProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const nextBlocked = variant === "block";
  const c = useThemeTokens().color;
  const styles = useMemo(() => makeSafetyStyles(c), [c]);
  return (
    <View style={styles.blockWrap}>
      <Button
        variant={nextBlocked ? "danger-ghost" : "secondary"}
        loading={loading}
        accessibilityState={{ selected: isBlocked }}
        onPress={() => setConfirming(true)}
      >
        {nextBlocked ? labels.block : labels.unblock}
      </Button>
      {confirming ? (
        <Surface variant="flat" padding="3" style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>{labels.confirmTitle}</Text>
          <Text style={styles.confirmBody}>{labels.confirmBody}</Text>
          <View style={styles.confirmActions}>
            <Button size="sm" variant="secondary" onPress={() => setConfirming(false)}>
              {labels.cancel}
            </Button>
            <Button
              size="sm"
              variant={nextBlocked ? "danger-ghost" : "primary"}
              loading={loading}
              onPress={() => {
                setConfirming(false);
                onChange(nextBlocked, userId);
              }}
            >
              {labels.confirmCta}
            </Button>
          </View>
        </Surface>
      ) : null}
    </View>
  );
}

export interface BlockedListItemLabels {
  unblock: string;
}

export interface BlockedListItemProps {
  item: BlockedUserDTO;
  onUnblock(blockedUserId: string): void;
  labels: BlockedListItemLabels;
  loading?: boolean;
}

export function BlockedListItem({
  item,
  onUnblock,
  labels,
  loading = false,
}: BlockedListItemProps): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useMemo(() => makeSafetyStyles(c), [c]);
  return (
    <View style={styles.blockedRow}>
      <Avatar
        size="md"
        user={{
          id: item.blockedUserId,
          handle: item.blockedHandle,
          firstName: item.blockedDisplayName,
          lastName: "",
          avatarUrl: item.blockedAvatarUrl,
        }}
      />
      <View style={styles.blockedText}>
        <Text numberOfLines={1} style={styles.blockedName}>
          {item.blockedDisplayName}
        </Text>
        <Text numberOfLines={1} style={styles.blockedHandle}>
          @{item.blockedHandle}
        </Text>
      </View>
      <Button
        variant="secondary"
        size="sm"
        loading={loading}
        onPress={() => onUnblock(item.blockedUserId)}
      >
        {labels.unblock}
      </Button>
    </View>
  );
}
