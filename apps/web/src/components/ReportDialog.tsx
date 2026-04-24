"use client";

// ReportDialog — modal form for filing a /reports row.
//
// Kept intentionally dumb: controlled open/onClose, a target descriptor the
// caller owns, and a submit path that only talks to the backend. No
// toasts or routing here — the caller decides what to do on success.

import { ReportReason, type ReportTargetKind } from "@palnet/shared";
import { Button, cx } from "@palnet/ui-web";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { z } from "zod";

type Reason = (typeof ReportReason)[keyof typeof ReportReason];

const ReasonOrder: Reason[] = [
  ReportReason.SPAM,
  ReportReason.HARASSMENT,
  ReportReason.HATE_SPEECH,
  ReportReason.VIOLENCE,
  ReportReason.ADULT_CONTENT,
  ReportReason.IMPERSONATION,
  ReportReason.OTHER,
];

const AckSchema = z.object({ id: z.string(), createdAt: z.string() });

export interface ReportDialogProps {
  open: boolean;
  onClose(): void;
  targetKind: ReportTargetKind;
  targetId: string;
}

export function ReportDialog({
  open,
  onClose,
  targetKind,
  targetId,
}: ReportDialogProps): JSX.Element | null {
  const t = useTranslations("moderation.reportDialog");
  const [reason, setReason] = useState<Reason>(ReportReason.SPAM);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const titleId = useId();
  const firstFocus = useRef<HTMLInputElement | null>(null);

  // Reset state every time the dialog reopens — a new target shouldn't
  // carry residue from the last report.
  useEffect(() => {
    if (!open) return;
    setReason(ReportReason.SPAM);
    setDetails("");
    setBusy(false);
    setStatus("idle");
    // Defer focus so the dialog has mounted.
    const id = window.setTimeout(() => firstFocus.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setStatus("idle");
    try {
      await apiFetch("/reports", AckSchema, {
        method: "POST",
        token,
        body: {
          targetKind,
          targetId,
          reason,
          details: details.trim() ? details.trim() : undefined,
        },
      });
      setStatus("ok");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="bg-ink/40 fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cx("bg-surface w-full max-w-md rounded-lg p-5 shadow-xl", "flex flex-col gap-4")}
      >
        <header className="flex flex-col gap-1">
          <h2 id={titleId} className="text-ink text-lg font-bold">
            {t("title")}
          </h2>
          <p className="text-ink-muted text-sm">{t("subtitle")}</p>
        </header>

        {status === "ok" ? (
          <section
            role="status"
            className="border-brand-200 bg-brand-50 text-brand-700 rounded-md border p-3 text-sm"
          >
            <p className="font-semibold">{t("successTitle")}</p>
            <p>{t("successBody")}</p>
          </section>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-ink mb-1 text-sm font-semibold">{t("reasonLegend")}</legend>
            {ReasonOrder.map((r, i) => (
              <label
                key={r}
                className="text-ink hover:bg-surface-subtle has-[:focus-visible]:border-brand-600 flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm"
              >
                <input
                  ref={i === 0 ? firstFocus : undefined}
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-brand-600"
                />
                <span>{t(`reasons.${r}`)}</span>
              </label>
            ))}
          </fieldset>
        )}

        {status !== "ok" ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink font-semibold">{t("detailsLabel")}</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("detailsPlaceholder")}
              rows={3}
              maxLength={1000}
              className="border-line-soft bg-surface text-ink placeholder:text-ink-muted/60 focus:border-brand-600 focus:ring-brand-600/30 w-full resize-y rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2"
            />
          </label>
        ) : null}

        {status === "error" ? (
          <p role="alert" className="text-danger text-sm">
            {t("genericError")}
          </p>
        ) : null}

        <footer className="flex items-center justify-end gap-2">
          {status === "ok" ? (
            <Button variant="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                {t("cancel")}
              </Button>
              <Button
                onClick={() => {
                  void submit();
                }}
                loading={busy}
              >
                {t("submit")}
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
