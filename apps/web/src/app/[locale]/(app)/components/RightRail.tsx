"use client";

import Link from "next/link";
import { Avatar, Icon, RetryChip, Skeleton, Surface } from "@baydar/ui-web";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { jobSource, jobSourceInitial } from "@baydar/shared";
import type { Job, PersonSuggestion } from "@baydar/shared";

interface RightRailProps {
  suggestions: PersonSuggestion[];
  suggestionsLoading: boolean;
  suggestionsError: boolean;
  onRetrySuggestions: () => void;
  jobs: Job[];
  jobsLoading: boolean;
  jobSuggestionsError: boolean;
  onRetryJobs: () => void;
}

/**
 * Both rail cards head with the same title + "see all" row. They were two
 * copies of one block, which is how only one of them was seen to collide:
 * `justify-between` alone lets the two ends touch once the title fills the row,
 * and the Arabic title is the longer one. `gap-2` + a truncating title keeps
 * them apart whatever the label length.
 */
function RailHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3">
      <span className="text-ink truncate text-sm font-semibold">{title}</span>
      <Link
        href={href}
        className="min-h-target text-ink-muted hover:text-brand-700 focus-visible:outline-hidden inline-flex shrink-0 items-center rounded-sm text-xs focus-visible:[box-shadow:var(--focus-ring)]"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

export function RightRail({
  suggestions,
  suggestionsLoading,
  suggestionsError,
  onRetrySuggestions,
  jobs,
  jobsLoading,
  jobSuggestionsError,
  onRetryJobs,
}: RightRailProps) {
  const t = useTranslations("feed.rail");
  const tCommon = useTranslations("common");
  const tJobs = useTranslations("jobs");
  const locale = useLocale();
  return (
    // 300px is the right-rail width in DESIGN.md §10.1 (`225px | 1fr | 300px`).
    // Without it the aside was content-sized: 323px with suggestions, 169px with
    // none — a visible shift between loading, empty and loaded, and at 169px the
    // header below squeezed its title and "see all" link to a 1px gap, which in
    // Arabic merged two words into one unreadable run.
    <aside
      aria-label={t("pymk")}
      className="hidden w-[300px] shrink-0 flex-col gap-3 xl:sticky xl:top-20 xl:flex"
    >
      <Surface variant="card" padding="0">
        <RailHeader title={t("pymk")} href="/network" linkLabel={t("pymkAll")} />
        {suggestionsLoading ? (
          <RailRowsSkeleton />
        ) : suggestions.length > 0 ? (
          <ul className="flex flex-col">
            {suggestions.slice(0, 4).map((s) => (
              <li
                key={s.user.userId}
                className="border-line-soft flex items-start gap-2.5 border-t px-4 py-3 first:border-t-0"
              >
                <Avatar
                  user={{
                    id: s.user.userId,
                    handle: s.user.handle,
                    firstName: s.user.firstName,
                    lastName: s.user.lastName,
                    avatarUrl: s.user.avatarUrl ?? null,
                  }}
                  size="sm"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/in/${s.user.handle}`}
                    className="target-area text-ink focus-visible:outline-hidden truncate rounded-sm text-sm font-semibold hover:underline focus-visible:[box-shadow:var(--focus-ring)]"
                  >
                    {s.user.firstName} {s.user.lastName}
                  </Link>
                  {s.user.headline ? (
                    <span className="text-ink-muted truncate text-xs">{s.user.headline}</span>
                  ) : null}
                  <span className="text-micro text-ink-muted mt-0.5">{t("pymkReason")}</span>
                </div>
                <Link
                  href={`/in/${s.user.handle}`}
                  className="target-area border-brand-600 text-brand-700 hover:bg-brand-50 focus-visible:outline-hidden inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold focus-visible:[box-shadow:var(--focus-ring)]"
                >
                  <Icon name="plus" size={12} />
                  {t("connect")}
                </Link>
              </li>
            ))}
          </ul>
        ) : suggestionsError ? (
          <RailError
            message={t("pymkFailed")}
            retryLabel={tCommon("retry")}
            onRetry={onRetrySuggestions}
            loading={suggestionsLoading}
          />
        ) : (
          // Was a bare "—". The jobs card one Surface below answers its own
          // empty state with a link out; this one left the reader at a dash.
          <div className="px-4 py-3 text-xs">
            <Link
              href="/network"
              className="text-ink-muted hover:text-brand-700 focus-visible:outline-hidden rounded-sm focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {t("pymkEmpty")}
            </Link>
          </div>
        )}
      </Surface>

      <Surface variant="card" padding="0">
        <RailHeader title={t("jobs")} href={`/${locale}/jobs`} linkLabel={t("pymkAll")} />
        {jobsLoading ? (
          <RailRowsSkeleton />
        ) : jobs.length > 0 ? (
          <ul className="flex flex-col">
            {jobs.map((j) => {
              const metaParts = [j.city, tJobs(`locationLabels.${j.locationMode}`)].filter(
                Boolean,
              ) as string[];
              return (
                <li key={j.id} className="border-line-soft border-t px-4 py-3 first:border-t-0">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="focus-visible:outline-hidden flex items-start gap-2.5 rounded-sm hover:opacity-90 focus-visible:[box-shadow:var(--focus-ring)]"
                  >
                    <div
                      className="bg-surface-sunken text-ink-muted flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md text-xs font-semibold"
                      aria-hidden="true"
                    >
                      {jobSource(j).imageUrl ? (
                        <Image
                          src={jobSource(j).imageUrl!}
                          alt=""
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                          sizes="36px"
                        />
                      ) : (
                        jobSourceInitial(jobSource(j))
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-ink truncate text-sm font-semibold">{j.title}</span>
                      <span className="text-ink-muted truncate text-xs">{jobSource(j).name}</span>
                      {metaParts.length > 0 ? (
                        <span className="text-micro text-ink-muted mt-0.5 truncate">
                          {metaParts.join(" · ")}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : jobSuggestionsError ? (
          <RailError
            message={t("jobsFailed")}
            retryLabel={tCommon("retry")}
            onRetry={onRetryJobs}
            loading={jobsLoading}
          />
        ) : (
          <div className="px-4 py-3 text-xs">
            <Link
              href={`/${locale}/jobs`}
              className="text-ink-muted hover:text-brand-700 focus-visible:outline-hidden rounded-sm focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {t("jobsEmpty")}
            </Link>
          </div>
        )}
      </Surface>
    </aside>
  );
}

function RailError({
  message,
  retryLabel,
  onRetry,
  loading,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  loading: boolean;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <p className="text-ink-muted text-xs">{message}</p>
      <RetryChip onRetry={onRetry} label={retryLabel} loading={loading} />
    </div>
  );
}

function RailRowsSkeleton(): JSX.Element {
  return (
    <ul aria-hidden="true" className="flex flex-col">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="border-line-soft flex items-start gap-2.5 border-t px-4 py-3 first:border-t-0"
        >
          <Skeleton kind="circle" className="h-9 w-9 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton kind="pill" className="h-6 w-14 shrink-0" />
        </li>
      ))}
    </ul>
  );
}
