"use client";

import Link from "next/link";
import { Avatar, Icon, RetryChip, Surface } from "@baydar/ui-web";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { Job } from "@baydar/shared";

interface RightRailProps {
  suggestions: {
    user: {
      userId: string;
      handle: string;
      firstName: string;
      lastName: string;
      headline: string | null;
      avatarUrl: string | null;
    };
  }[];
  suggestionsError: boolean;
  onRetrySuggestions: () => void;
  jobs: Job[];
  jobSuggestionsError: boolean;
  onRetryJobs: () => void;
}

export function RightRail({
  suggestions,
  suggestionsError,
  onRetrySuggestions,
  jobs,
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
          <Link href="/network" className="text-ink-muted hover:text-brand-700 text-xs">
            {t("pymkAll")}
          </Link>
        </div>
        {suggestions.length > 0 ? (
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
                    className="text-ink truncate text-sm font-semibold hover:underline"
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
                  className="border-brand-600 text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-600 inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold focus:outline-none focus-visible:ring-2"
                >
                  <Icon name="plus" size={12} />
                  {t("connect")}
                </Link>
              </li>
            ))}
          </ul>
        ) : suggestionsError ? (
          <div className="flex items-center justify-end px-4 py-3">
            <RetryChip onRetry={onRetrySuggestions} label={tCommon("retry")} />
          </div>
        ) : (
          <div className="text-ink-muted px-4 py-3 text-xs">—</div>
        )}
      </Surface>

      <Surface variant="card" padding="0">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-ink text-sm font-semibold">{t("jobs")}</span>
          <Link href={`/${locale}/jobs`} className="text-ink-muted hover:text-brand-700 text-xs">
            {t("pymkAll")}
          </Link>
        </div>
        {jobs.length > 0 ? (
          <ul className="flex flex-col">
            {jobs.map((j) => {
              const metaParts = [j.city, tJobs(`locationLabels.${j.locationMode}`)].filter(
                Boolean,
              ) as string[];
              return (
                <li key={j.id} className="border-line-soft border-t px-4 py-3 first:border-t-0">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="flex items-start gap-2.5 hover:opacity-90"
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
          <div className="flex items-center justify-end px-4 py-3">
            <RetryChip onRetry={onRetryJobs} label={tCommon("retry")} />
          </div>
        ) : (
          <div className="px-4 py-3 text-xs">
            <Link href={`/${locale}/jobs`} className="text-ink-muted hover:text-brand-700">
              {t("jobsEmpty")}
            </Link>
          </div>
        )}
      </Surface>
    </aside>
  );
}
