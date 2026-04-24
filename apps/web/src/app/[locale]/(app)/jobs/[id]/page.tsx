"use client";

// Job detail — v1:
//   • Hero: company logo + title + company name + meta line.
//   • Description (pre-wrapped multi-paragraph).
//   • Skills chips.
//   • Apply CTA — opens an <ApplyDialog> so the user can attach an optional
//     cover letter. Submit POSTs to /jobs/:id/apply with `{ coverLetter }`.
//     The endpoint is idempotent, so retrying after a network error is safe.

import { ApplyToJobBody, formatSalaryRange, Job as JobSchema, type Job } from "@palnet/shared";
import { Button, Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { apiCall, apiFetch } from "@/lib/api";
import { readSession } from "@/lib/session";

export default function JobDetailPage(): JSX.Element {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = typeof params?.id === "string" ? params.id : "";

  const [token, setToken] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  useEffect(() => {
    if (!token || !jobId) return;
    setLoading(true);
    setError(null);
    apiFetch(`/jobs/${jobId}`, JobSchema, { token })
      .then((j) => setJob(j))
      .catch((e: Error) => setError(e.message || tCommon("genericError")))
      .finally(() => setLoading(false));
  }, [token, jobId, tCommon]);

  const handleApplied = useCallback(() => {
    setJob((j) => (j ? { ...j, viewer: { ...j.viewer, hasApplied: true } } : j));
    setApplyOpen(false);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-4 py-6">
        <Surface variant="card" padding="6" aria-hidden="true">
          <div className="mb-4 flex items-start gap-3">
            <div className="bg-surface-sunken h-14 w-14 animate-pulse rounded-md" />
            <div className="flex-1 space-y-2">
              <div className="bg-surface-sunken h-5 w-2/3 animate-pulse rounded" />
              <div className="bg-surface-sunken h-4 w-1/3 animate-pulse rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="bg-surface-sunken h-3 w-full animate-pulse rounded" />
            <div className="bg-surface-sunken h-3 w-[95%] animate-pulse rounded" />
            <div className="bg-surface-sunken h-3 w-[90%] animate-pulse rounded" />
          </div>
        </Surface>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-4 py-6">
        <Surface variant="tinted" padding="6">
          <p className="text-ink-muted text-sm">{error ?? t("notFound")}</p>
          <Link href="/jobs" className="text-brand-700 mt-3 inline-block text-sm hover:underline">
            ← {t("title")}
          </Link>
        </Surface>
      </div>
    );
  }

  const metaParts = [
    job.city,
    t(`locationLabels.${job.locationMode}`),
    t(`typeLabels.${job.type}`),
  ].filter(Boolean) as string[];

  const salary = formatSalaryRange(
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency ?? "USD",
    locale,
  );

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-6">
      <nav className="mb-3">
        <Link href="/jobs" className="text-ink-muted hover:text-ink text-sm">
          ← {t("title")}
        </Link>
      </nav>

      <Surface variant="hero" padding="6" as="header">
        <div className="flex items-start gap-4">
          <div
            className="bg-surface-sunken text-ink-muted flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md text-base font-semibold"
            aria-hidden="true"
          >
            {job.company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={job.company.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (job.company.name[0] ?? "?").toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-ink truncate text-xl font-semibold">{job.title}</h1>
            <Link
              href={`/companies/${job.company.slug}`}
              className="text-ink-muted hover:text-ink text-sm"
            >
              {job.company.name}
            </Link>
            <p className="text-ink-muted mt-1 text-xs">{metaParts.join(" · ")}</p>
            {salary ? <p className="text-ink mt-1 text-sm font-semibold">{salary}</p> : null}
          </div>
          <div className="shrink-0">
            {job.viewer.hasApplied ? (
              <span
                className="border-success/30 bg-success/10 text-success inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold"
                aria-live="polite"
              >
                ✓ {t("appliedBadge")}
              </span>
            ) : (
              <Button variant="accent" onClick={() => setApplyOpen(true)} aria-label={t("apply")}>
                {t("apply")}
              </Button>
            )}
          </div>
        </div>
      </Surface>

      <Surface variant="card" padding="6" className="mt-4">
        <h2 className="text-ink mb-2 text-sm font-semibold">{t("description")}</h2>
        <div className="text-ink whitespace-pre-wrap text-sm leading-relaxed">
          {job.description}
        </div>
      </Surface>

      {job.skillsRequired.length > 0 ? (
        <Surface variant="card" padding="6" className="mt-4">
          <h2 className="text-ink mb-2 text-sm font-semibold">{t("skills")}</h2>
          <ul className="flex flex-wrap gap-1.5">
            {job.skillsRequired.map((s) => (
              <li key={s} className="bg-surface-subtle text-ink rounded-full px-2.5 py-1 text-xs">
                {s}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      {applyOpen && token ? (
        <ApplyDialog
          job={job}
          token={token}
          onClose={() => setApplyOpen(false)}
          onApplied={handleApplied}
        />
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// ApplyDialog — centered modal with an optional cover letter field.
// Focus jumps to the textarea on open; Esc + overlay click close.
// Not extracted as a ui-web atom yet — we want two consumers first.
// ────────────────────────────────────────────────────────────────────────

interface ApplyDialogProps {
  job: Job;
  token: string;
  onClose: () => void;
  onApplied: () => void;
}

function ApplyDialog({ job, token, onClose, onApplied }: ApplyDialogProps): JSX.Element {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const [coverLetter, setCoverLetter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titleId = useId();
  const hintId = useId();

  // Focus textarea on open; scroll-lock the body while the dialog is up.
  useEffect(() => {
    textareaRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return (): void => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc closes.
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
      setSubmitError((e as Error).message || tCommon("genericError"));
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
              className="border-line-hard bg-surface text-ink focus:ring-brand-600 min-h-[140px] resize-y rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
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
