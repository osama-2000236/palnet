"use client";

// Jobs listing — REFACTORED to consume the new ui-web atoms (Sweep PR).
//
// Changes from `main`:
//   • Removed the local `FilterChip` function — now `<Chip onClick active>`.
//   • Raw <input> for `search` and `city` filters replaced with <Input>
//     (gains: hover state, focus ring from --focus-ring, leading icon
//     support, consistent height with the rest of the app).
//   • Plain-text "error in tinted Surface" replaced with <Alert kind="danger">
//     — gains: icon, severity colour, embedded retry action.
//   • Skill chips in the row card are now `<Chip>` instead of ad-hoc
//     `<li>` spans — same visual, consistent with the filter side.
//
// Nothing about the data flow, pagination, or routing changed.

import {
  Bookmark,
  BookmarkType,
  cursorPage,
  formatCurrency,
  Job as JobSchema,
  type Job,
} from "@baydar/shared";
import { Alert, Button, Chip, EmptyState, Surface } from "@baydar/ui-web";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useState } from "react";

import { apiCall, apiFetch, apiFetchPage } from "@/lib/api";
import { getErrorCode, toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";
import { JobFilters, type JobFiltersState } from "./_components/JobFilters";
import { JobListRow, JobRowSkeleton } from "./_components/JobListRow";

const JobsPage = cursorPage(JobSchema);

const EMPTY_FILTERS: JobFiltersState = {
  q: "",
  city: "",
  type: "",
  locationMode: "",
  companyId: "",
  companyName: "",
  industry: "",
};

function buildQs(filters: JobFiltersState, after: string | null): string {
  const qs = new URLSearchParams({ limit: "20" });
  if (after) qs.set("after", after);
  if (filters.q) qs.set("q", filters.q);
  if (filters.city) qs.set("city", filters.city);
  if (filters.type) qs.set("type", filters.type);
  if (filters.locationMode) qs.set("locationMode", filters.locationMode);
  if (filters.companyId) qs.set("companyId", filters.companyId);
  if (filters.industry) qs.set("industry", filters.industry);
  return qs.toString();
}

function formatSalary(job: Job, t: (k: string) => string, locale: string): string | null {
  const { salaryMin, salaryMax, salaryCurrency } = job;
  if (!salaryMin && !salaryMax) return null;
  const cur = salaryCurrency ?? "USD";
  if (salaryMin && salaryMax) {
    return `${formatCurrency(salaryMin, cur, locale)}–${formatCurrency(salaryMax, cur, locale)}`;
  }
  if (salaryMin) {
    return `${t("from")} ${formatCurrency(salaryMin, cur, locale)}`;
  }
  return `${t("upTo")} ${formatCurrency(salaryMax!, cur, locale)}`;
}

export default function JobsPageRoute(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <JobsPageInner />
    </Suspense>
  );
}

function JobsPageInner(): JSX.Element {
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFiltersState>(() => ({
    ...EMPTY_FILTERS,
    companyId: params.get("companyId") ?? "",
    companyName: params.get("company") ?? "",
  }));
  const [items, setItems] = useState<Job[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  const load = useCallback(
    async (tk: string, after: string | null, f: JobFiltersState): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const page = await apiFetchPage(`/jobs?${buildQs(f, after)}`, JobsPage, { token: tk });
        setItems((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } catch (e) {
        if (getErrorCode(e) === "PROFILE_ONBOARDING_REQUIRED") {
          router.replace(`/${locale}/onboarding?return=${encodeURIComponent("/jobs")}`);
          return;
        }
        setError(toErrorMessage(e, tErr));
      } finally {
        setLoading(false);
        setFirstLoad(false);
      }
    },
    [tErr, router, locale],
  );

  useEffect(() => {
    if (!token) return;
    const id = setTimeout(() => void load(token, null, filters), 250);
    return (): void => clearTimeout(id);
  }, [token, filters, load]);

  // Retry helper used by both the error Alert and (potentially) future
  // "stale results" banners.
  const retry = useCallback(() => {
    if (!token) return;
    void load(token, null, filters);
  }, [token, filters, load]);

  const toggleSave = useCallback(
    async (job: Job): Promise<void> => {
      if (!token || savingId) return;
      const bookmarkId = job.viewer.bookmarkId;
      setSavingId(job.id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === job.id
            ? {
                ...item,
                viewer: { ...item.viewer, bookmarkId: bookmarkId ? null : "pending_bookmark" },
              }
            : item,
        ),
      );
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
        setItems((prev) =>
          prev.map((item) =>
            item.id === job.id
              ? { ...item, viewer: { ...item.viewer, bookmarkId: created.id } }
              : item,
          ),
        );
      } catch {
        setItems((prev) => prev.map((item) => (item.id === job.id ? job : item)));
      } finally {
        setSavingId(null);
      }
    },
    [savingId, token],
  );

  return (
    <div className="mx-auto grid w-full max-w-[1128px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* ── Filters rail ─────────────────────────────────────────── */}
      <div className="hidden lg:block">
        <JobFilters filters={filters} onChange={setFilters} />
      </div>

      {/* ── Results main ─────────────────────────────────────────── */}
      <main>
        {filters.companyId ? (
          <div className="mb-3">
            <Chip
              active
              onClick={() => {
                setFilters((current) => ({ ...current, companyId: "", companyName: "" }));
                router.replace(`/${locale}/jobs`);
              }}
              aria-label={t("clearCompanyFilter")}
            >
              {t("companyFilter", { name: filters.companyName || filters.companyId })} ×
            </Chip>
          </div>
        ) : null}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-ink text-xl font-semibold">{t("title")}</h1>
          <span className="text-ink-muted text-sm" aria-live="polite">
            {items.length > 0
              ? t("countSummary", { count: items.length })
              : firstLoad
                ? ""
                : t("noneSummary")}
          </span>
        </div>

        {firstLoad ? (
          <ul className="space-y-3">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <JobRowSkeleton />
              </li>
            ))}
          </ul>
        ) : error ? (
          // ── BEFORE: <Surface variant="tinted" padding="6"><p>{error}</p></Surface>
          // ── AFTER:  Alert with severity, icon, and a retry action.
          <Alert
            kind="danger"
            title={t("loadFailedTitle")}
            action={
              <Button variant="secondary" size="sm" onClick={retry}>
                {tCommon("retry")}
              </Button>
            }
          >
            {error}
          </Alert>
        ) : items.length === 0 ? (
          <Surface variant="card" padding="0">
            <EmptyState motif="jobs" title={t("emptyTitle")} body={t("emptyDesc")} />
          </Surface>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((job) => (
                <li key={job.id}>
                  <JobListRow
                    job={job}
                    salary={formatSalary(job, t, locale)}
                    saving={savingId === job.id}
                    onToggleSave={() => void toggleSave(job)}
                  />
                </li>
              ))}
            </ul>
            {hasMore ? (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={loading}
                  onClick={() => token && cursor && void load(token, cursor, filters)}
                >
                  {loading ? tCommon("loading") : t("loadMore")}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
