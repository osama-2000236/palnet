import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { safetyStyles as styles } from "./safety.styles";
import { Sheet } from "./Sheet";
import { Surface } from "./Surface";

export type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "HATE"
  | "MISINFORMATION"
  | "NUDITY"
  | "VIOLENCE"
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
}

const REASONS = [
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
}: ReportSheetProps): JSX.Element {
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [details, setDetails] = useState("");

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
