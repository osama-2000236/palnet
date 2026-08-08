"use client";

import { useId, useState } from "react";

import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { RadioGroup } from "./RadioGroup";
import { Surface } from "./Surface";

// Restated rather than imported: ui-web is framework- and app-neutral and does
// not depend on @baydar/shared. `useReportLabels` types its bundle off this
// union, so a value added there and missed here fails type-check at the app.
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

export interface ReportDialogLabels {
  title: string;
  detailsLabel: string;
  cancel: string;
  submit: string;
  close: string;
  reasons: Record<ReportReason, string>;
}

export interface ReportDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  target: ReportTarget;
  onSubmit(input: { target: ReportTarget; reason: ReportReason; details?: string }): void;
  labels: ReportDialogLabels;
  submitting?: boolean;
  /**
   * Reason selected when the dialog opens. Lets a surface that already knows
   * what is being reported — the never-pay banner's one-tap path — skip the
   * step where the user finds the right radio. Defaults to SPAM, the neutral
   * catch-all: reporting a post or a comment must not open pre-accusing the
   * author of demanding money.
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

export function ReportDialog({
  open,
  onOpenChange,
  target,
  onSubmit,
  labels,
  submitting = false,
  initialReason = "SPAM",
}: ReportDialogProps): JSX.Element | null {
  const formId = useId();
  const detailsId = useId();
  const [reason, setReason] = useState<ReportReason>(initialReason);
  const [details, setDetails] = useState("");

  // Reset on open, adjusted during render rather than in an effect (the repo
  // lints `react-hooks/set-state-in-effect`). Two call sites — PostCard and the
  // public profile — keep this mounted with `open={false}` rather than
  // unmounting it, so without this a reopened dialog kept the last reason and
  // the last details text.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason(initialReason);
      setDetails("");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={labels.title}
      closeLabel={labels.close}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            {labels.cancel}
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {labels.submit}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        tabIndex={-1}
        data-autofocus
        // `focus:outline-hidden` (not focus-visible): Dialog focuses this
        // tabIndex={-1} form programmatically on open, and the UA outline would
        // paint a box around the whole form. No ring replaces it here on
        // purpose — the form isn't keyboard-reachable, and the real controls
        // inside carry their own focus rings.
        className="focus:outline-hidden flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ target, reason, details: details.trim() || undefined });
        }}
      >
        <RadioGroup
          legend={<span className="sr-only">{labels.title}</span>}
          value={reason}
          onValueChange={(value) => setReason(value as ReportReason)}
          items={REASONS.map((item) => ({ value: item, label: labels.reasons[item] }))}
        />

        <label className="flex flex-col gap-1 text-sm" htmlFor={detailsId}>
          <span className="text-ink font-semibold">{labels.detailsLabel}</span>
          <textarea
            id={detailsId}
            value={details}
            onChange={(event) => setDetails(event.currentTarget.value)}
            maxLength={2000}
            rows={4}
            className="border-line-hard text-ink focus-visible:border-brand-600 focus-visible:outline-hidden rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:[box-shadow:var(--focus-ring)]"
          />
        </label>
      </form>
    </Dialog>
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
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={nextBlocked ? "danger-ghost" : "secondary"}
        onClick={() => setConfirming(true)}
        loading={loading}
        aria-pressed={isBlocked}
      >
        {nextBlocked ? labels.block : labels.unblock}
      </Button>
      {confirming ? (
        <Surface variant="flat" padding="3" className="max-w-sm">
          <div className="flex flex-col gap-2">
            <p className="text-ink text-sm font-semibold">{labels.confirmTitle}</p>
            <p className="text-ink-muted text-sm">{labels.confirmBody}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                {labels.cancel}
              </Button>
              <Button
                size="sm"
                variant={nextBlocked ? "danger-ghost" : "primary"}
                loading={loading}
                onClick={() => {
                  setConfirming(false);
                  onChange(nextBlocked, userId);
                }}
              >
                {labels.confirmCta}
              </Button>
            </div>
          </div>
        </Surface>
      ) : null}
    </div>
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
    <li className="border-line-soft flex items-center gap-3 border-b py-3">
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
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-sm font-semibold">{item.blockedDisplayName}</p>
        <p dir="ltr" className="text-ink-muted truncate text-xs">
          @{item.blockedHandle}
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        loading={loading}
        onClick={() => onUnblock(item.blockedUserId)}
      >
        {labels.unblock}
      </Button>
    </li>
  );
}
