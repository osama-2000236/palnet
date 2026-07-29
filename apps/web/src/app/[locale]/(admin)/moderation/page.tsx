"use client";

import { Button, Checkbox, EmptyState, Surface, Tab, Tabs, useToast } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch, ApiRequestError, getValidAccessToken } from "@/lib/api";

import { Report, ReportRow, type ModerationAction } from "./_components/ReportRow";

export default function ModerationPage(): JSX.Element {
  const router = useRouter();
  const t = useTranslations("admin.moderation");
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

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
    setSelected([]);
    void load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openIds = (reports ?? []).filter((r) => r.resolvedAt === null).map((r) => r.id);
  const allSelected = openIds.length > 0 && selected.length === openIds.length;

  // Escape clears the selection — the standard way out of a multi-select
  // without reaching for the mouse.
  useEffect(() => {
    if (selected.length === 0) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setSelected([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected.length]);

  // ponytail: sequential, not Promise.all — the queue is tens of rows, and one
  // request at a time keeps the 409 "another moderator got here first" path
  // meaningful instead of racing our own writes. Batch endpoint if it ever
  // gets slow enough to notice.
  async function bulkDismiss(): Promise<void> {
    const token = await getValidAccessToken();
    if (!token || selected.length === 0) return;
    setBulkBusy(true);
    setError(null);
    let done = 0;
    for (const reportId of selected) {
      try {
        await apiFetch(`/admin/moderation/reports/${reportId}/actions`, Report, {
          method: "POST",
          token,
          body: { action: "DISMISS" satisfies ModerationAction },
        });
        done += 1;
      } catch {
        // Keep going: one stale row must not strand the rest of the batch.
      }
    }
    const failed = selected.length - done;
    showToast({
      kind: failed > 0 ? "error" : "success",
      message: failed > 0 ? t("bulk.partial", { done, failed }) : t("bulk.done", { done }),
    });
    setSelected([]);
    setBulkBusy(false);
    await load();
  }

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

      {/* Bulk bar. DISMISS only: it is the high-volume, reversible-by-refiling
       * action a spam flood generates. WARN/SUSPEND/HARD_DELETE stay per-row —
       * a bulk account deletion is how a queue becomes an incident. */}
      {openIds.length > 0 ? (
        <div className="border-line-soft bg-surface-subtle flex flex-wrap items-center gap-3 rounded-md border px-4 py-2.5">
          <Checkbox
            checked={allSelected}
            indeterminate={selected.length > 0 && !allSelected}
            onChange={(checked) => setSelected(checked ? openIds : [])}
            label={t("bulk.selectAll")}
          />
          {selected.length > 0 ? (
            <>
              <span className="text-ink-muted text-sm">
                {t("bulk.selected", { count: selected.length })}
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="secondary"
                loading={bulkBusy}
                onClick={() => void bulkDismiss()}
              >
                {t("bulk.dismiss")}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <Surface variant="flat" padding="0" hidden={!reports?.length}>
        <ul>
          {(reports ?? []).map((report) => (
            <li key={report.id} className="border-line-soft border-b last:border-b-0">
              <ReportRow
                report={report}
                selected={selected.includes(report.id)}
                onSelectedChange={(checked) =>
                  setSelected((prev) =>
                    checked ? [...prev, report.id] : prev.filter((id) => id !== report.id),
                  )
                }
                pendingAction={pendingAction}
                actionsDisabled={pendingAction !== null || bulkBusy}
                onAct={(action) => void act(report.id, action)}
              />
            </li>
          ))}
        </ul>
      </Surface>
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
