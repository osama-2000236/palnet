"use client";

// Jobs listing — v1 shape per Sprint 6:
//   • Left: filters (location mode, job type, city search) — controlled.
//   • Center: paginated list of jobs.
//   • Each row: company logo + title + company name + city · mode · type +
//     salary range + skills chips. "Applied ✓" tag if the viewer already
//     submitted an application.
//
// Deliberately skipping the right-rail for v1 — we can re-use the feed PYMK
// rail once there's more to surface (e.g. saved jobs, company suggestions).

import {
  cursorPage,
  formatCurrency,
  Job as JobSchema,
  JobLocationMode,
  JobType,
  type Job,
} from "@palnet/shared";
import { Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiFetchPage } from "@/lib/api";
import { readSession } from "@/lib/session";

const JobsPage = cursorPage(JobSchema);

type Filters = {
  q: string;
  city: string;
  type: JobType | "";
  locationMode: JobLocationMode | "";
};

const EMPTY_FILTERS: Filters = { q: "", city: "", type: "", locationMode: "" };

function buildQs(filters: Filters, after: string | null): string {
  const qs = new URLSearchParams({ limit: "20" });
  if (after) qs.set("after", after);
  if (filters.q) qs.set("q", filters.q);
  if (filters.city) qs.set("city", filters.city);
  if (filters.type) qs.set("type", filters.type);
  if (filters.locationMode) qs.set("locationMode", filters.locationMode);
  return qs.toString();
}

function formatSalary(
  job: Job,
  t: (k: string) => string,
  locale: string,
): string | null {
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
  const t = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [items, setItems] = useState<Job[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session bootstrap.
  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  const load = useCallback(
    async (tk: string, after: string | null, f: Filters): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const page = await apiFetchPage(
          `/jobs?${buildQs(f, after)}`,
          JobsPage,
          { token: tk },
        );
        setItems((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } catch (e) {
        setError((e as Error).message || tCommon("genericError"));
      } finally {
        setLoading(false);
        setFirstLoad(false);
      }
    },
    [tCommon],
  );

  // Initial + re-run whenever filters change. Debounce query + city.
  useEffect(() => {
    if (!token) return;
    const id = setTimeout(() => void load(token, null, filters), 250);
    return (): void => clearTimeout(id);
  }, [token, filters, load]);

  return (
    <div className="mx-auto grid w-full max-w-[1128px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <Surface variant="card" padding="4" as="aside">
          <h2 className="mb-3 text-sm font-semibold text-ink">{t("filters")}</h2>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-ink-muted">{t("search")}</span>
            <input
              type="search"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-md border border-line-hard bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs text-ink-muted">{t("city")}</span>
            <input
              type="text"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              placeholder={t("cityPlaceholder")}
              className="w-full rounded-md border border-line-hard bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </label>

          <fieldset className="mb-3">
            <legend className="mb-1 block text-xs text-ink-muted">{t("type")}</legend>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={filters.type === ""}
                onClick={() => setFilters((f) => ({ ...f, type: "" }))}
                label={t("any")}
              />
              {(Object.values(JobType) as JobType[]).map((kind) => (
                <FilterChip
                  key={kind}
                  active={filters.type === kind}
                  onClick={() => setFilters((f) => ({ ...f, type: kind }))}
                  label={t(`typeLabels.${kind}`)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1 block text-xs text-ink-muted">{t("location")}</legend>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                active={filters.locationMode === ""}
                onClick={() =>
                  setFilters((f) => ({ ...f, locationMode: "" }))
                }
                label={t("any")}
              />
              {(Object.values(JobLocationMode) as JobLocationMode[]).map((m) => (
                <FilterChip
                  key={m}
                  active={filters.locationMode === m}
                  onClick={() => setFilters((f) => ({ ...f, locationMode: m }))}
                  label={t(`locationLabels.${m}`)}
                />
              ))}
            </div>
          </fieldset>
        </Surface>
      </aside>

      <main>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-ink">{t("title")}</h1>
          <span className="text-sm text-ink-muted" aria-live="polite">
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
          <Surface variant="tinted" padding="6">
            <p className="text-sm text-ink-muted">{error}</p>
          </Surface>
        ) : items.length === 0 ? (
          <Surface variant="tinted" padding="8">
            <div className="mx-auto max-w-sm text-center">
              <div
                aria-hidden="true"
                className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-lg text-brand-700"
              >
                ▦
              </div>
              <p className="text-sm font-semibold text-ink">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-ink-muted">{t("emptyDesc")}</p>
            </div>
          </Surface>
        ) : (
          <>
            <ul className="space-y-3">
              {items.map((job) => (
                <li key={job.id}>
                  <JobListRow job={job} salary={formatSalary(job, t, locale)} />
                </li>
              ))}
            </ul>
            {hasMore ? (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => token && cursor && void load(token, cursor, filters)}
                  disabled={loading}
                  className="rounded-md border border-line-hard bg-surface px-4 py-1.5 text-sm text-ink hover:bg-surface-subtle disabled:opacity-55"
                >
                  {loading ? tCommon("loading") : t("loadMore")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-full border border-brand-600 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
          : "rounded-full border border-line-hard bg-surface px-3 py-1 text-xs text-ink-muted hover:bg-surface-subtle"
      }
    >
      {label}
    </button>
  );
}

function JobListRow({
  job,
  salary,
}: {
  job: Job;
  salary: string | null;
}): JSX.Element {
  const t = useTranslations("jobs");
  const metaParts = [
    job.city,
    t(`locationLabels.${job.locationMode}`),
    t(`typeLabels.${job.type}`),
  ].filter(Boolean) as string[];

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <Surface variant="card" padding="4" className="transition-colors hover:border-brand-400">
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-sunken text-sm font-semibold text-ink-muted"
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-ink">
                  {job.title}
                </h3>
                <p className="truncate text-sm text-ink-muted">
                  {job.company.name}
                </p>
              </div>
              {job.viewer.hasApplied ? (
                <span className="shrink-0 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                  {t("appliedBadge")}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-ink-muted">{metaParts.join(" · ")}</p>
            {salary ? (
              <p className="mt-1 text-xs font-semibold text-ink">{salary}</p>
            ) : null}
            {job.skillsRequired.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1">
                {job.skillsRequired.slice(0, 5).map((s) => (
                  <li
                    key={s}
                    className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-ink-muted"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </Surface>
    </Link>
  );
}

function JobRowSkeleton(): JSX.Element {
  return (
    <Surface variant="card" padding="4" aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-md bg-surface-sunken" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-sunken" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-surface-sunken" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface-sunken" />
        </div>
      </div>
    </Surface>
  );
}
