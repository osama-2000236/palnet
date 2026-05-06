"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { cx } from "./cx";
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

export function ReportDialog({
  open,
  onOpenChange,
  target,
  onSubmit,
  labels,
  submitting = false,
}: ReportDialogProps): JSX.Element | null {
  const titleId = useId();
  const detailsId = useId();
  const panelRef = useRef<HTMLFormElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      restoreRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <Surface
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        variant="hero"
        padding="5"
        className="w-full max-w-md outline-none"
        onKeyDown={(event) => {
          if (event.key === "Escape") onOpenChange(false);
        }}
      >
        <form
          ref={panelRef}
          tabIndex={-1}
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({ target, reason, details: details.trim() || undefined });
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-ink text-lg font-semibold">
              {labels.title}
            </h2>
            <button
              type="button"
              aria-label={labels.close}
              onClick={() => onOpenChange(false)}
              className="text-ink-muted hover:bg-surface-subtle focus-visible:ring-brand-600 inline-flex h-10 w-10 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2"
            >
              x
            </button>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{labels.title}</legend>
            {REASONS.map((item) => (
              <label
                key={item}
                className={cx(
                  "border-line-soft flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                  item === reason ? "bg-brand-50 text-brand-700" : "bg-surface text-ink",
                )}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={item}
                  checked={item === reason}
                  onChange={() => setReason(item)}
                  className="accent-brand-600"
                />
                <span>{labels.reasons[item]}</span>
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-1 text-sm" htmlFor={detailsId}>
            <span className="text-ink font-semibold">{labels.detailsLabel}</span>
            <textarea
              id={detailsId}
              value={details}
              onChange={(event) => setDetails(event.currentTarget.value)}
              maxLength={2000}
              rows={4}
              className="border-line-hard text-ink focus-visible:border-brand-600 focus-visible:ring-brand-600/30 rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
            />
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
              {labels.cancel}
            </Button>
            <Button type="submit" loading={submitting}>
              {labels.submit}
            </Button>
          </div>
        </form>
      </Surface>
    </div>
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
