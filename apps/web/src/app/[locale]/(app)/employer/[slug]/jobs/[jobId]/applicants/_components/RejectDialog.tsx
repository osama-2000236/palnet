"use client";

// Reject with a reason — native twin at
// apps/mobile/app/(app)/employer/[slug]/_components/RejectSheet.tsx.
//
// The API refuses a reasonless rejection (UpdateApplicationStatusBody), so this
// is the employer-facing half of that contract rather than the enforcement.

import { REJECTION_NOTE_MAX, RejectionReason } from "@baydar/shared";
import { Button, Dialog, RadioGroup, Textarea } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useState } from "react";

const REASONS = Object.values(RejectionReason) as RejectionReason[];

export function RejectDialog({
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
  const t = useTranslations("employer.reject");
  const tReasons = useTranslations("employer.rejectionReasons");
  const tCommon = useTranslations("common");
  const [reason, setReason] = useState<RejectionReason>(RejectionReason.POSITION_FILLED);
  const [note, setNote] = useState("");

  const needsNote = reason === RejectionReason.OTHER;
  const trimmed = note.trim();
  const ready = !needsNote || trimmed.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("title")}
      description={t("body")}
      closeLabel={tCommon("cancel")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={busy}
            disabled={!ready}
            onClick={() => onConfirm(reason, needsNote ? trimmed : undefined)}
          >
            {t("confirm")}
          </Button>
        </>
      }
    >
      <RadioGroup
        legend={t("legend")}
        value={reason}
        onValueChange={(v) => setReason(v as RejectionReason)}
        items={REASONS.map((r) => ({ value: r, label: tReasons(r), testID: `reject-${r}` }))}
      />
      {needsNote ? (
        <Textarea
          fullWidth
          rows={3}
          className="mt-3"
          value={note}
          maxLength={REJECTION_NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          aria-label={t("noteLabel")}
          placeholder={t("notePlaceholder")}
          helper={t("noteHelper")}
        />
      ) : null}
    </Dialog>
  );
}
