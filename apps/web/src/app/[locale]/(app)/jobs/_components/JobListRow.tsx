"use client";

import type { Job } from "@baydar/shared";
import { Chip, Skeleton, Surface } from "@baydar/ui-web";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function JobListRow({ job, salary }: { job: Job; salary: string | null }): JSX.Element {
  const t = useTranslations("jobs");
  const metaParts = [
    job.city,
    t(`locationLabels.${job.locationMode}`),
    t(`typeLabels.${job.type}`),
  ].filter(Boolean) as string[];

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block focus-visible:[box-shadow:var(--focus-ring)] focus-visible:outline-none"
    >
      <Surface variant="card" padding="4" className="hover:border-brand-400 transition-colors">
        <div className="flex items-start gap-3">
          <div
            className="bg-surface-sunken text-ink-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-semibold"
            aria-hidden="true"
          >
            {job.company.logoUrl ? (
              <Image
                src={job.company.logoUrl}
                alt=""
                width={48}
                height={48}
                className="object-cover"
              />
            ) : (
              (job.company.name[0] ?? "?").toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-ink truncate text-base font-semibold">{job.title}</h2>
                <p className="text-ink-muted truncate text-sm">{job.company.name}</p>
              </div>
              {job.viewer.hasApplied ? (
                <Chip
                  size="sm"
                  dotClassName="bg-success"
                  className="border-success/30 bg-success/10 text-success"
                >
                  {t("appliedBadge")}
                </Chip>
              ) : null}
            </div>
            <p className="text-ink-muted mt-1 text-xs">{metaParts.join(" · ")}</p>
            {salary ? <p className="text-ink mt-1 text-xs font-semibold">{salary}</p> : null}
            {job.skillsRequired.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1">
                {job.skillsRequired.slice(0, 5).map((s) => (
                  <li key={s}>
                    <Chip size="sm">{s}</Chip>
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

export function JobRowSkeleton(): JSX.Element {
  return (
    <Surface variant="card" padding="4" aria-hidden="true">
      <div className="flex items-start gap-3">
        <Skeleton radius="var(--radius-md)" className="h-12 w-12 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </Surface>
  );
}
