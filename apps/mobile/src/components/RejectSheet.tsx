// Reject with a reason — web twin at
// apps/web/.../employer/[slug]/jobs/[jobId]/applicants/_components/RejectDialog.tsx.
// Same props and the same two-field contract; web uses `Dialog`, native `Sheet`,
// which is the one asymmetry the kits already carry.
//
// The API refuses a reasonless rejection (UpdateApplicationStatusBody), so this
// is the employer-facing half of that contract rather than the enforcement.

import { REJECTION_NOTE_MAX, RejectionReason } from "@baydar/shared";
import { Button, RadioGroup, Sheet, Textarea, nativeTokens } from "@baydar/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

const REASONS = Object.values(RejectionReason) as RejectionReason[];

export function RejectSheet({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: RejectionReason, note?: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState<RejectionReason>(RejectionReason.POSITION_FILLED);
  const [note, setNote] = useState("");

  const needsNote = reason === RejectionReason.OTHER;
  const trimmed = note.trim();
  const ready = !needsNote || trimmed.length > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("employer.reject.title")}
      closeLabel={t("common.cancel")}
    >
      <View style={styles.body}>
        <RadioGroup
          label={t("employer.reject.legend")}
          value={reason}
          onValueChange={(v) => setReason(v as RejectionReason)}
          items={REASONS.map((r) => ({ value: r, label: t(`employer.rejectionReasons.${r}`) }))}
        />
        {needsNote ? (
          <Textarea
            fullWidth
            rows={3}
            value={note}
            maxLength={REJECTION_NOTE_MAX}
            onChangeText={setNote}
            placeholder={t("employer.reject.notePlaceholder")}
            accessibilityLabel={t("employer.reject.noteLabel")}
            helperText={t("employer.reject.noteHelper")}
          />
        ) : null}
        <Button
          variant="primary"
          fullWidth
          loading={busy}
          disabled={!ready}
          onPress={() => onConfirm(reason, needsNote ? trimmed : undefined)}
          accessibilityLabel={t("employer.reject.confirm")}
        >
          {t("employer.reject.confirm")}
        </Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: nativeTokens.space[4],
  },
});
