"use client";

import {
  belowMinimumWage,
  formatRelativeTime,
  type Job,
  jobSource,
  jobSourceInitial,
} from "@baydar/shared";
import { Badge, Chip, Icon, RecordCardSkeleton, Surface, cx } from "@baydar/ui-web";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

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
  const locale = useLocale();
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
          className="focus-visible:outline-hidden flex min-w-0 flex-1 items-start gap-3 rounded-md focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <SourceLogo job={job} />
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              {/* `line-clamp-2`, mirroring RecordCard: a one-line ellipsis in
                  RTL cuts a trailing Latin run mid-word — "… — NestJS" painted
                  as "… — tJS…". */}
              <h2 className="bidi-plaintext text-ink line-clamp-2 text-base font-semibold">
                {job.title}
              </h2>
              <p className="bidi-plaintext text-ink-muted truncate text-sm">
                {jobSource(job).name}
              </p>
            </div>
            {/* Salary joins the meta line instead of claiming its own row: on a
                jobs board these are read as one fact ("Ramallah · hybrid ·
                full-time · ₪2,500–4,500"), and the extra line was pushing the
                skill chips below the fold on a 390px screen. */}
            <p className="text-ink-muted mt-1 text-xs">
              {metaParts.join(" · ")}
              {salary ? (
                <>
                  {" · "}
                  <span className="text-ink font-semibold">{salary}</span>
                </>
              ) : null}
            </p>
            {/* Statutory floor, Council of Ministers Resolution No. 4 of 2021.
                Sits on the salary line rather than with the applied badge: it
                qualifies the number, and beside it is where it is read. */}
            {belowMinimumWage(job) ? (
              <p className="mt-1">
                <Badge tone="warning" srLabel={t("belowMinimumSr")}>
                  {t("belowMinimumBadge")}
                </Badge>
              </p>
            ) : null}
            {/* Recency is the first thing anyone scans a jobs list for, and it
                was the one fact the row never showed — `createdAt` has always
                been on the DTO. */}
            <p className="text-micro text-ink-subtle mt-1">
              {formatRelativeTime(job.createdAt, locale)}
            </p>
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
        {/* Column, not a row: `shrink-0` beside a `flex-1` column means every
            pixel this block takes comes out of the job. Measured at 390px, the
            applied badge and the save button side by side were 126px of a
            324px card — the title truncated, the meta line broke mid-salary and
            each skill chip landed on its own line. The native twin has always
            stacked these (`trailing: { alignItems: "flex-end" }`). */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {onToggleSave ? (
            <button
              type="button"
              aria-label={saved ? t("saved") : t("save")}
              aria-pressed={saved}
              disabled={saving}
              onClick={onToggleSave}
              className={cx(
                "target-area state-layer hover:bg-surface-subtle focus-visible:outline-hidden inline-flex h-9 w-9 items-center justify-center rounded-md focus-visible:[box-shadow:var(--focus-ring)]",
                "disabled:cursor-not-allowed disabled:opacity-60",
                saved ? "text-brand-700" : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon name="bookmark" size={18} />
            </button>
          ) : null}
          {/* Was a `Chip` with three classes overriding the chip recipe's own
              border, background and text colour — i.e. a Badge, hand-rolled out
              of the wrong primitive. */}
          {job.viewer.hasApplied ? (
            <Badge tone="success" dot srLabel={t("appliedBadge")}>
              {t("appliedBadge")}
            </Badge>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

function SourceLogo({ job }: { job: Job }): JSX.Element {
  return (
    <div
      className="bg-surface-sunken text-ink-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md text-sm font-semibold"
      aria-hidden="true"
    >
      {jobSource(job).imageUrl ? (
        <Image
          src={jobSource(job).imageUrl!}
          alt=""
          width={48}
          height={48}
          className="object-cover"
        />
      ) : (
        jobSourceInitial(jobSource(job))
      )}
    </div>
  );
}

export function JobRowSkeleton(): JSX.Element {
  return <RecordCardSkeleton variant="row" />;
}
