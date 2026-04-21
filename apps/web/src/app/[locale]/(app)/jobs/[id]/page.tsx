"use client";

// Job detail — v1:
//   • Hero: company logo + title + company name + meta line.
//   • Description (pre-wrapped multi-paragraph).
//   • Skills chips.
//   • Apply CTA — POSTs to /jobs/:id/apply. Endpoint is idempotent so the
//     button can be re-pressed without the client tracking state. A loading
//     spinner keeps the press honest; success flips the button to a disabled
//     "Applied" tag + inline confirmation.

import {
  Job as JobSchema,
  type Job,
} from "@palnet/shared";
import { Button, Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiCall, apiFetch } from "@/lib/api";
import { readSession } from "@/lib/session";

export default function JobDetailPage(): JSX.Element {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = typeof params?.id === "string" ? params.id : "";

  const [token, setToken] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

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

  const handleApply = useCallback(async (): Promise<void> => {
    if (!token || !job || applying) return;
    setApplying(true);
    setApplyError(null);
    // Optimistic: flip hasApplied before the round-trip. Rollback on failure.
    setJob((j) => (j ? { ...j, viewer: { ...j.viewer, hasApplied: true } } : j));
    try {
      await apiCall(`/jobs/${job.id}/apply`, {
        method: "POST",
        token,
        body: {},
      });
    } catch (e) {
      setJob((j) => (j ? { ...j, viewer: { ...j.viewer, hasApplied: false } } : j));
      setApplyError((e as Error).message || tCommon("genericError"));
    } finally {
      setApplying(false);
    }
  }, [token, job, applying, tCommon]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-4 py-6">
        <Surface variant="card" padding="6" aria-hidden="true">
          <div className="mb-4 flex items-start gap-3">
            <div className="h-14 w-14 animate-pulse rounded-md bg-surface-sunken" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-2/3 animate-pulse rounded bg-surface-sunken" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-surface-sunken" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-surface-sunken" />
            <div className="h-3 w-[95%] animate-pulse rounded bg-surface-sunken" />
            <div className="h-3 w-[90%] animate-pulse rounded bg-surface-sunken" />
          </div>
        </Surface>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-4 py-6">
        <Surface variant="tinted" padding="6">
          <p className="text-sm text-ink-muted">{error ?? t("notFound")}</p>
          <Link
            href="/jobs"
            className="mt-3 inline-block text-sm text-brand-700 hover:underline"
          >
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

  const salary =
    job.salaryMin || job.salaryMax
      ? `${job.salaryMin ? job.salaryMin.toLocaleString() : ""}${job.salaryMin && job.salaryMax ? "–" : ""}${job.salaryMax ? job.salaryMax.toLocaleString() : ""} ${job.salaryCurrency ?? ""}`.trim()
      : null;

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-6">
      <nav className="mb-3">
        <Link href="/jobs" className="text-sm text-ink-muted hover:text-ink">
          ← {t("title")}
        </Link>
      </nav>

      <Surface variant="hero" padding="6" as="header">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken text-base font-semibold text-ink-muted"
            aria-hidden="true"
          >
            {job.company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.company.logoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (job.company.name[0] ?? "?").toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-ink">{job.title}</h1>
            <Link
              href={`/companies/${job.company.slug}`}
              className="text-sm text-ink-muted hover:text-ink"
            >
              {job.company.name}
            </Link>
            <p className="mt-1 text-xs text-ink-muted">{metaParts.join(" · ")}</p>
            {salary ? (
              <p className="mt-1 text-sm font-semibold text-ink">{salary}</p>
            ) : null}
          </div>
          <div className="shrink-0">
            {job.viewer.hasApplied ? (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success"
                aria-live="polite"
              >
                ✓ {t("appliedBadge")}
              </span>
            ) : (
              <Button
                variant="accent"
                onClick={handleApply}
                loading={applying}
                aria-label={t("apply")}
              >
                {t("apply")}
              </Button>
            )}
          </div>
        </div>
        {applyError ? (
          <p className="mt-3 text-xs text-danger">{applyError}</p>
        ) : null}
      </Surface>

      <Surface variant="card" padding="6" className="mt-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">{t("description")}</h2>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
          {job.description}
        </div>
      </Surface>

      {job.skillsRequired.length > 0 ? (
        <Surface variant="card" padding="6" className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">{t("skills")}</h2>
          <ul className="flex flex-wrap gap-1.5">
            {job.skillsRequired.map((s) => (
              <li
                key={s}
                className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs text-ink"
              >
                {s}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </div>
  );
}
