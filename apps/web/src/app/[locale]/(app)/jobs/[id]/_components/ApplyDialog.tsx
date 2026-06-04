"use client";

import { ApplyToJobBody, type Job } from "@baydar/shared";
import { Button } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { apiCall } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";

interface ApplyDialogProps {
  job: Job;
  token: string;
  onClose: () => void;
  onApplied: () => void;
}

export function ApplyDialog({ job, token, onClose, onApplied }: ApplyDialogProps): JSX.Element {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titleId = useId();
  const hintId = useId();

  useEffect(() => {
    textareaRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return (): void => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return (): void => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(): Promise<void> {
    setSubmitError(null);
    const trimmed = coverLetter.trim();
    const parsed = ApplyToJobBody.safeParse(trimmed ? { coverLetter: trimmed } : {});
    if (!parsed.success) {
      setSubmitError(tCommon("genericError"));
      return;
    }
    setSubmitting(true);
    try {
      await apiCall(`/jobs/${job.id}/apply`, {
        method: "POST",
        token,
        body: parsed.data,
      });
      onApplied();
    } catch (e) {
      setSubmitError(toErrorMessage(e, tErr));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="bg-ink/40 fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        className="border-line-soft bg-surface shadow-pop w-full max-w-[560px] rounded-lg border"
      >
        <div className="border-line-soft border-b px-5 py-4">
          <h2 id={titleId} className="text-ink text-base font-semibold">
            {t("applyTitle", { title: job.title })}
          </h2>
          <p id={hintId} className="text-ink-muted mt-1 text-sm">
            {t("applySubtitle", { company: job.company.name })}
          </p>
        </div>

        <div className="px-5 py-4">
          <label className="flex flex-col gap-1">
            <span className="text-ink text-sm font-medium">{t("coverLetterLabel")}</span>
            <textarea
              ref={textareaRef}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              maxLength={8000}
              rows={6}
              placeholder={t("coverLetterPlaceholder")}
              className="border-line-hard bg-surface text-ink min-h-[140px] resize-y rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            />
            <span className="text-ink-muted text-xs">{t("coverLetterHint")}</span>
          </label>

          {submitError ? (
            <p
              role="alert"
              className="border-danger/30 bg-danger/10 text-danger mt-3 rounded-md border px-3 py-2 text-xs"
            >
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="border-line-soft flex items-center justify-end gap-2 border-t px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {tCommon("cancel")}
          </Button>
          <Button variant="accent" onClick={() => void submit()} loading={submitting}>
            {t("submitApplication")}
          </Button>
        </div>
      </div>
    </div>
  );
}
