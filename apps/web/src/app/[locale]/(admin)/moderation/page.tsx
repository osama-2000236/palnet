"use client";

import { Button, EmptyState, Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
});
type Report = z.infer<typeof Report>;
type ModerationAction = "DISMISS" | "WARN" | "SUSPEND" | "HARD_DELETE";

const ACTIONS: ModerationAction[] = ["DISMISS", "WARN", "SUSPEND", "HARD_DELETE"];

export default function ModerationPage(): JSX.Element {
  const router = useRouter();
  const t = useTranslations("admin.moderation");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function load(): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(null);
    try {
      setReports(
        await apiFetch("/admin/moderation/reports?status=open", z.array(Report), { token }),
      );
    } catch {
      setError(t("loadFailed"));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              const target =
                report.targetUserId ??
                report.targetPostId ??
                report.targetCommentId ??
                report.targetMessageId ??
                null;
              return (
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-semibold">{report.reason}</p>
                    <p className="text-ink-muted text-xs">
                      <span dir="ltr">{new Date(report.createdAt).toLocaleString()}</span>
                      {" · "}
                      {t("reporter")} <span dir="ltr">{report.reporterId}</span>
                    </p>
                    <p className="text-ink-muted mt-2 text-sm">
                      {t("target")} {target ? <span dir="ltr">{target}</span> : t("unknown")}
                    </p>
                    {report.details ? (
                      <p className="text-ink mt-2 text-sm">{report.details}</p>
                    ) : null}
                  </div>
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
          <EmptyState motif="settings" title={t("emptyTitle")} body={t("emptyBody")} />
        </Surface>
      ) : null}
    </main>
  );
}
