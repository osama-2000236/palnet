"use client";

import { Avatar, Button, EmptyState, Surface, Tab, Tabs, useToast } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch, ApiRequestError, getValidAccessToken } from "@/lib/api";

const Report = z.object({
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
type Report = z.infer<typeof Report>;
type ModerationAction = "DISMISS" | "WARN" | "SUSPEND" | "HARD_DELETE";

const ACTIONS: ModerationAction[] = ["DISMISS", "WARN", "SUSPEND", "HARD_DELETE"];

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ModerationPage(): JSX.Element {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.moderation");
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function load(status: "open" | "resolved" = tab): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(null);
    try {
      setReports(
        await apiFetch(`/admin/moderation/reports?status=${status}`, z.array(Report), { token }),
      );
    } catch {
      setError(t("loadFailed"));
    }
  }

  useEffect(() => {
    setReports(null);
    void load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function act(reportId: string, action: ModerationAction): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    if (action === "HARD_DELETE" && !window.confirm(t("confirmHardDelete"))) return;
    const key = `${reportId}:${action}`;
    setPendingAction(key);
    setError(null);
    try {
      await apiFetch(`/admin/moderation/reports/${reportId}/actions`, Report, {
        method: "POST",
        token,
        body: { action },
      });
      showToast({ kind: "success", message: t("actionDone", { action: t(`actions.${action}`) }) });
      await load();
    } catch (err) {
      // Another moderator may have resolved the report; refresh so the queue
      // does not keep offering actions on a stale row.
      await load();
      setError(
        err instanceof ApiRequestError && err.status === 409
          ? t("actionConflict")
          : t("actionFailed"),
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 px-6 py-8">
      <header>
        <p className="text-brand-700 text-sm font-semibold">{t("kicker")}</p>
        <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>
      </header>
      <Tabs
        value={tab}
        onChange={(next) => setTab(next as "open" | "resolved")}
        label={t("tabsLabel")}
      >
        <Tab value="open">{t("tabs.open")}</Tab>
        <Tab value="resolved">{t("tabs.resolved")}</Tab>
      </Tabs>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <section className="flex flex-col gap-3">
        {(reports ?? []).map((report) => (
          <Surface
            key={report.id}
            as="article"
            variant="card"
            padding="4"
            data-testid={`moderation-report-${report.id}`}
          >
            {(() => {
              // Operator scan order: what kind of thing, then who reported it.
              // Raw ids stay reachable via title tooltips for forensics.
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
              return (
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-semibold">
                      {t(`reasons.${report.reason}`)}
                    </p>
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
                          {report.reporterHandle ? (
                            <span dir="ltr"> (@{report.reporterHandle})</span>
                          ) : null}
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
                    {report.details ? (
                      <p className="text-ink mt-2 text-sm">{report.details}</p>
                    ) : null}
                    {report.resolvedAt ? (
                      <p className="text-ink-muted mt-2 text-sm">
                        {t("resolvedNote")}{" "}
                        <span dir="ltr">{formatDate(report.resolvedAt, locale)}</span>
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
                  {report.resolvedAt === null ? (
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
                          disabled={pendingAction !== null}
                          onClick={() => void act(report.id, action)}
                        >
                          {t(`actions.${action}`)}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </Surface>
        ))}
      </section>
      {reports === null && !error ? (
        <Surface variant="flat" padding="4">
          <p className="text-ink-muted text-sm">{t("loading")}</p>
        </Surface>
      ) : null}
      {reports?.length === 0 ? (
        <Surface variant="flat" padding="4">
          {tab === "open" ? (
            <EmptyState
              motif="settings"
              direction="outline"
              title={t("emptyTitle")}
              body={t("emptyBody")}
            />
          ) : (
            <EmptyState
              motif="settings"
              direction="outline"
              title={t("emptyResolvedTitle")}
              body={t("emptyResolvedBody")}
            />
          )}
        </Surface>
      ) : null}
    </main>
  );
}
