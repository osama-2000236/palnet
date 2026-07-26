"use client";

import type { Job } from "@baydar/shared";
import { Chip, Icon, Skeleton, Surface, cx } from "@baydar/ui-web";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function JobListRow({
  job,
  salary,
  saving,
  onToggleSave,
}: {
  job: Job;
  salary: string | null;
  saving?: boolean;
  onToggleSave?: () => void;
}): JSX.Element {
  const t = useTranslations("jobs");
  const metaParts = [
    job.city,
    t(`locationLabels.${job.locationMode}`),
    t(`typeLabels.${job.type}`),
  ].filter(Boolean) as string[];
  const saved = job.viewer.bookmarkId !== null;

  return (
    <Surface variant="row" padding="4" className="hover:bg-surface-subtle transition-colors">
      <div className="flex items-start gap-3">
        <Link
          href={`/jobs/${job.id}`}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-md focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <CompanyLogo job={job} />
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <h2 className="bidi-plaintext text-ink truncate text-base font-semibold">
                {job.title}
              </h2>
              <p className="bidi-plaintext text-ink-muted truncate text-sm">{job.company.name}</p>
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
        </Link>
        <div className="flex shrink-0 items-start gap-2">
          {job.viewer.hasApplied ? (
            <Chip
              size="sm"
              dotClassName="bg-success"
              className="border-success/30 bg-success/10 text-success"
            >
              {t("appliedBadge")}
            </Chip>
          ) : null}
          {onToggleSave ? (
            <button
              type="button"
              aria-label={saved ? t("saved") : t("save")}
              aria-pressed={saved}
              disabled={saving}
              onClick={onToggleSave}
              className={cx(
                "hover:bg-surface-subtle target-area state-layer inline-flex h-9 w-9 items-center justify-center rounded-md focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]",
                "disabled:cursor-not-allowed disabled:opacity-60",
                saved ? "text-brand-700" : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon name="bookmark" size={18} />
            </button>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

function CompanyLogo({ job }: { job: Job }): JSX.Element {
  return (
    <div
      className="bg-surface-sunken text-ink-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-semibold"
      aria-hidden="true"
    >
      {job.company.logoUrl ? (
        <Image src={job.company.logoUrl} alt="" width={48} height={48} className="object-cover" />
      ) : (
        (job.company.name[0] ?? "?").toUpperCase()
      )}
    </div>
  );
}

export function JobRowSkeleton(): JSX.Element {
  return (
    <Surface variant="row" padding="4" aria-hidden="true">
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
