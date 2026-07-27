"use client";

// Job detail — v1:
//   • Hero: company logo + title + company name + meta line.
//   • Description (pre-wrapped multi-paragraph).
//   • Skills chips.
//   • Apply CTA — opens an <ApplyDialog> so the user can attach an optional
//     cover letter. Submit POSTs to /jobs/:id/apply with `{ coverLetter }`.
//     The endpoint is idempotent, so retrying after a network error is safe.

import {
  Bookmark,
  BookmarkType,
  formatSalaryRange,
  Job as JobSchema,
  type Job,
} from "@baydar/shared";
import { Button, Icon, Surface } from "@baydar/ui-web";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiCall, apiFetch, getValidAccessToken } from "@/lib/api";
import { getErrorCode, toErrorMessage } from "@/lib/error-message";
import { ApplyDialog } from "./_components/ApplyDialog";
import { JobDetailSkeleton } from "./_components/JobDetailSkeleton";
import { ShareJobButtons } from "./_components/ShareJobButtons";

export default function JobDetailPage(): JSX.Element {
  const t = useTranslations("jobs");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = typeof params?.id === "string" ? params.id : "";

  const [token, setToken] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  // getValidAccessToken (not readSession) — on a hard reload the persisted
  // session has no access token until the refresh flow runs.
  useEffect(() => {
    let cancelled = false;
    void getValidAccessToken().then((tk) => {
      if (cancelled) return;
      if (!tk) {
        router.replace("/login");
        return;
      }
      setToken(tk);
    });
    return (): void => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!token || !jobId) return;
    setLoading(true);
    setError(null);
    apiFetch(`/jobs/${jobId}`, JobSchema, { token })
      .then((j) => setJob(j))
      .catch((e) => {
        if (getErrorCode(e) === "PROFILE_ONBOARDING_REQUIRED") {
          router.replace(`/${locale}/onboarding?return=${encodeURIComponent(`/jobs/${jobId}`)}`);
          return;
        }
        setError(toErrorMessage(e, tErr));
      })
      .finally(() => setLoading(false));
  }, [token, jobId, tErr, router, locale]);

  const handleApplied = useCallback(() => {
    setJob((j) => (j ? { ...j, viewer: { ...j.viewer, hasApplied: true } } : j));
    setApplyOpen(false);
  }, []);

  const toggleSave = useCallback(async (): Promise<void> => {
    if (!token || !job || saveBusy) return;
    const bookmarkId = job.viewer.bookmarkId;
    setSaveBusy(true);
    setJob({
      ...job,
      viewer: { ...job.viewer, bookmarkId: bookmarkId ? null : "pending_bookmark" },
    });
    try {
      if (bookmarkId) {
        await apiCall(`/bookmarks/${bookmarkId}`, { method: "DELETE", token });
        return;
      }
      const created = await apiFetch("/bookmarks", Bookmark, {
        method: "POST",
        token,
        body: { type: BookmarkType.JOB, targetId: job.id },
      });
      setJob((current) =>
        current ? { ...current, viewer: { ...current.viewer, bookmarkId: created.id } } : current,
      );
    } catch {
      setJob(job);
    } finally {
      setSaveBusy(false);
    }
  }, [job, saveBusy, token]);

  if (loading) {
    return <JobDetailSkeleton />;
  }

  if (error || !job) {
    return (
      <main className="mx-auto w-full max-w-[820px] px-4 py-6">
        <Surface variant="tinted" padding="6">
          <p className="text-ink-muted text-sm">{error ?? t("notFound")}</p>
          <Link
            href="/jobs"
            className="text-brand-700 mt-3 inline-block text-sm hover:underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            <span aria-hidden="true" className="inline-block rtl:rotate-180">
              ←
            </span>{" "}
            {t("title")}
          </Link>
        </Surface>
      </main>
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
    // Was a <div>. The (app) layout wraps children in a plain div, so every page
    // owns its own landmark — and this one never had it, because the a11y sweep
    // could not reach this route to notice.
    <main className="mx-auto w-full max-w-[820px] px-4 py-6">
      <nav className="mb-3">
        <Link
          href="/jobs"
          className="text-ink-muted hover:text-ink text-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <span aria-hidden="true" className="inline-block rtl:rotate-180">
            ←
          </span>{" "}
          {t("title")}
        </Link>
      </nav>

      <Surface variant="hero" padding="6" as="header">
        <div className="flex items-start gap-4">
          <div
            className="bg-surface-sunken text-ink-muted flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md text-base font-semibold"
            aria-hidden="true"
          >
            {job.company.logoUrl ? (
              <Image
                src={job.company.logoUrl}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
                sizes="56px"
              />
            ) : (
              (job.company.name[0] ?? "?").toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-ink truncate text-xl font-semibold">{job.title}</h1>
            <Link
              href={`/companies/${job.company.slug}`}
              className="text-ink-muted hover:text-ink text-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {job.company.name}
            </Link>
            <p className="text-ink-muted mt-1 text-xs">{metaParts.join(" · ")}</p>
            {salary ? <p className="text-ink mt-1 text-sm font-semibold">{salary}</p> : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={saveBusy}
              onClick={() => void toggleSave()}
              leading={<Icon name="bookmark" size={16} />}
              aria-pressed={job.viewer.bookmarkId !== null}
            >
              {job.viewer.bookmarkId ? t("saved") : t("save")}
            </Button>
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
        <div className="border-line-soft mt-4 border-t pt-3">
          <ShareJobButtons jobId={job.id} title={`${job.title} — ${job.company.name}`} />
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
    </main>
  );
}
