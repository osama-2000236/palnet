"use client";

// One report in the moderation queue. Split out of page.tsx to keep both files
// under the qa:design LOC ceiling; the page owns the network and selection
// state, this file owns the row anatomy.

import { localeTag } from "@baydar/shared";
import { Avatar, Button, Checkbox, Surface } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";

export const Report = z.object({
  id: z.string(),
  reporterId: z.string(),
  reason: z.string(),
  details: z.string().nullable(),
  targetUserId: z.string().nullable(),
  targetPostId: z.string().nullable(),
  targetCommentId: z.string().nullable(),
  targetMessageId: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  resolvedNote: z.string().nullable(),
  createdAt: z.string().datetime(),
  reporterHandle: z.string().nullable().optional(),
  reporterName: z.string().nullable().optional(),
  targetPostExcerpt: z.string().nullable().optional(),
  targetPostDeleted: z.boolean().nullable().optional(),
});
export type Report = z.infer<typeof Report>;

export type ModerationAction = "DISMISS" | "WARN" | "SUSPEND" | "HARD_DELETE";
export const ACTIONS: ModerationAction[] = ["DISMISS", "WARN", "SUSPEND", "HARD_DELETE"];

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ReportRow({
  report,
  selected,
  onSelectedChange,
  pendingAction,
  actionsDisabled,
  onAct,
}: {
  report: Report;
  selected: boolean;
  onSelectedChange(next: boolean): void;
  pendingAction: string | null;
  actionsDisabled: boolean;
  onAct(action: ModerationAction): void;
}): JSX.Element {
  const locale = useLocale();
  const t = useTranslations("admin.moderation");

  // Operator scan order: what kind of thing, then who reported it. Raw ids stay
  // reachable via title tooltips for forensics.
  const targetKind = report.targetUserId
    ? "user"
    : report.targetPostId
      ? "post"
      : report.targetCommentId
        ? "comment"
        : report.targetMessageId
          ? "message"
          : null;
  const targetId =
    report.targetUserId ??
    report.targetPostId ??
    report.targetCommentId ??
    report.targetMessageId ??
    null;
  const open = report.resolvedAt === null;

  return (
    <Surface
      as="article"
      variant="row"
      padding="4"
      className="hover:bg-surface-subtle transition-colors"
      data-testid={`moderation-report-${report.id}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        {/* Checkbox first so Tab runs select → actions → next row instead of
         * forcing four stops before the next report. */}
        {open ? (
          <Checkbox
            className="mt-0.5 shrink-0"
            checked={selected}
            aria-label={t("bulk.selectOne")}
            onCheckedChange={onSelectedChange}
          />
        ) : null}
        <div className="min-w-0 md:flex-1">
          <p className="text-ink text-sm font-semibold">{t(`reasons.${report.reason}`)}</p>
          <div className="text-ink-muted flex items-center gap-1.5 text-xs">
            <span dir="ltr">{formatDate(report.createdAt, locale)}</span>
            {" · "}
            <span>{t("reporter")}</span>
            <Avatar
              user={{
                id: report.reporterId,
                handle: report.reporterHandle,
                firstName: report.reporterName,
              }}
              size="xs"
            />
            {report.reporterName ? (
              <span>
                {report.reporterName}
                {report.reporterHandle ? <span dir="ltr"> (@{report.reporterHandle})</span> : null}
              </span>
            ) : (
              <span title={report.reporterId}>{t("unknown")}</span>
            )}
          </div>
          <p className="text-ink-muted mt-2 text-sm">
            {t("target")}{" "}
            {targetKind ? (
              <span title={targetId ?? undefined}>{t(`targets.${targetKind}`)}</span>
            ) : (
              t("unknown")
            )}
            {report.targetPostDeleted ? <> · {t("targetDeleted")}</> : null}
          </p>
          {report.targetPostExcerpt ? (
            <blockquote className="border-line-soft bg-surface-muted text-ink mt-2 border-s-2 p-2 text-sm">
              {report.targetPostExcerpt}
            </blockquote>
          ) : null}
          {report.details ? <p className="text-ink mt-2 text-sm">{report.details}</p> : null}
          {report.resolvedAt ? (
            <p className="text-ink-muted mt-2 text-sm">
              {t("resolvedNote")} <span dir="ltr">{formatDate(report.resolvedAt, locale)}</span>
              {report.resolvedNote ? (
                <>
                  {" · "}
                  {(ACTIONS as string[]).includes(report.resolvedNote)
                    ? t(`actions.${report.resolvedNote}`)
                    : report.resolvedNote}
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        {open ? (
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={
                  action === "DISMISS"
                    ? "secondary"
                    : action === "WARN"
                      ? "outline"
                      : "danger-ghost"
                }
                loading={pendingAction === `${report.id}:${action}`}
                disabled={actionsDisabled}
                onClick={() => onAct(action)}
              >
                {t(`actions.${action}`)}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
