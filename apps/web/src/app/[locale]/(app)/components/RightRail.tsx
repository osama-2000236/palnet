"use client";

import Link from "next/link";
import { Avatar, Icon, RetryChip, Skeleton, Surface } from "@baydar/ui-web";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
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
    <aside aria-label={t("pymk")} className="hidden flex-col gap-3 xl:sticky xl:top-20 xl:flex">
      <Surface variant="card" padding="0">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-ink text-sm font-semibold">{t("pymk")}</span>
          <Link
            href="/network"
            className="text-ink-muted hover:text-brand-700 rounded-sm text-xs focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            {t("pymkAll")}
          </Link>
        </div>
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
                    className="text-ink truncate rounded-sm text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
                  >
                    {s.user.firstName} {s.user.lastName}
                  </Link>
                  {s.user.headline ? (
                    <span className="text-ink-muted truncate text-xs">{s.user.headline}</span>
                  ) : null}
                  <span className="text-ink-muted mt-0.5 text-[11px]">{t("pymkReason")}</span>
                </div>
                <Link
                  href={`/in/${s.user.handle}`}
                  className="border-brand-600 text-brand-700 hover:bg-brand-50 inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
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
          <div className="text-ink-muted px-4 py-3 text-xs">—</div>
        )}
      </Surface>

      <Surface variant="card" padding="0">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-ink text-sm font-semibold">{t("jobs")}</span>
          <Link
            href={`/${locale}/jobs`}
            className="text-ink-muted hover:text-brand-700 rounded-sm text-xs focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            {t("pymkAll")}
          </Link>
        </div>
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
                    className="flex items-start gap-2.5 rounded-sm hover:opacity-90 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
                  >
                    <div
                      className="bg-surface-sunken text-ink-muted flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md text-xs font-semibold"
                      aria-hidden="true"
                    >
                      {j.company.logoUrl ? (
                        <Image
                          src={j.company.logoUrl}
                          alt=""
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                          sizes="36px"
                        />
                      ) : (
                        (j.company.name[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-ink truncate text-sm font-semibold">{j.title}</span>
                      <span className="text-ink-muted truncate text-xs">{j.company.name}</span>
                      {metaParts.length > 0 ? (
                        <span className="text-ink-muted mt-0.5 truncate text-[11px]">
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
              className="text-ink-muted hover:text-brand-700 rounded-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
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
