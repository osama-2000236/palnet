"use client";

import { formatRelativeTime, type Job } from "@baydar/shared";
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
          <CompanyLogo job={job} />
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <h2 className="bidi-plaintext text-ink truncate text-base font-semibold">
                {job.title}
              </h2>
              <p className="bidi-plaintext text-ink-muted truncate text-sm">{job.company.name}</p>
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
        <div className="flex shrink-0 items-start gap-2">
          {/* Was a `Chip` with three classes overriding the chip recipe's own
              border, background and text colour — i.e. a Badge, hand-rolled out
              of the wrong primitive. */}
          {job.viewer.hasApplied ? (
            <Badge tone="success" dot srLabel={t("appliedBadge")}>
              {t("appliedBadge")}
            </Badge>
          ) : null}
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
  return <RecordCardSkeleton variant="row" />;
}
