"use client";

import {
  AdminReportItem,
  AdminReportPage,
  ReportReason,
  type AdminReportItem as AdminReport,
  type AdminReportStatus,
  type ReportReason as ReportReasonValue,
} from "@palnet/shared";
import { Avatar, Surface } from "@palnet/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiRequestError, apiFetch, apiFetchPage } from "@/lib/api";
import { readSession } from "@/lib/session";

const TARGET_KINDS = ["USER", "POST", "COMMENT", "MESSAGE"] as const;
type TargetKind = (typeof TARGET_KINDS)[number];

const STATUSES: AdminReportStatus[] = ["open", "resolved", "all"];
const REASONS = Object.values(ReportReason) as ReportReasonValue[];
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function buildQs(filters: Filters, after: string | null, limit = "20"): string {
  const qs = new URLSearchParams({ limit, status: filters.status });
  if (after) qs.set("after", after);
  if (filters.reason) qs.set("reason", filters.reason);
  if (filters.targetKind) qs.set("targetKind", filters.targetKind);
  if (filters.reporter) qs.set("reporter", filters.reporter);
  if (filters.resolver) qs.set("resolver", filters.resolver);
  addDateFilter(qs, "createdFrom", filters.createdFrom, "start");
  addDateFilter(qs, "createdTo", filters.createdTo, "end");
  addDateFilter(qs, "resolvedFrom", filters.resolvedFrom, "start");
  addDateFilter(qs, "resolvedTo", filters.resolvedTo, "end");
  return qs.toString();
}

type Filters = {
  status: AdminReportStatus;
  reason: ReportReasonValue | "";
  targetKind: TargetKind | "";
  reporter: string;
  resolver: string;
  createdFrom: string;
  createdTo: string;
  resolvedFrom: string;
  resolvedTo: string;
};

const EMPTY_FILTERS: Filters = {
  status: "open",
  reason: "",
  targetKind: "",
  reporter: "",
  resolver: "",
  createdFrom: "",
  createdTo: "",
  resolvedFrom: "",
  resolvedTo: "",
};

export default function AdminReportsPage(): JSX.Element {
  const t = useTranslations("admin.moderation");
  const tReason = useTranslations("moderation.reportDialog.reasons");
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [items, setItems] = useState<AdminReport[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [resolving, setResolving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  const active = useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0] ?? null,
    [activeId, items],
  );

  const load = useCallback(async (tk: string, after: string | null, nextFilters: Filters) => {
    setLoading(true);
    setError(false);
    setForbidden(false);
    try {
      const page = await apiFetchPage(
        `/admin/reports?${buildQs(nextFilters, after)}`,
        AdminReportPage,
        { token: tk },
      );
      setItems((prev) => {
        const next = after ? [...prev, ...page.data] : page.data;
        setActiveId((current) =>
          current && next.some((r) => r.id === current) ? current : (next[0]?.id ?? null),
        );
        return next;
      });
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 403) {
        setForbidden(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void load(token, null, filters);
  }, [token, filters, load]);

  async function resolve(report: AdminReport): Promise<void> {
    if (!token || resolving) return;
    setResolving(true);
    setError(false);
    try {
      const updated = await apiFetch(`/admin/reports/${report.id}/resolve`, AdminReportItem, {
        method: "POST",
        token,
        body: { note: resolveNote || undefined },
      });
      setItems((prev) => {
        const next =
          filters.status === "open"
            ? prev.filter((item) => item.id !== updated.id)
            : prev.map((item) => (item.id === updated.id ? updated : item));
        setActiveId(next[0]?.id ?? null);
        return next;
      });
      setResolveNote("");
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 403) setForbidden(true);
      else setError(true);
    } finally {
      setResolving(false);
    }
  }

  // Refresh a single report row in-place after a side-effect (suspend,
  // takedown, appeal review). We re-fetch the detail so resolved+appeal
  // state stays accurate without a full page reload.
  const refreshReport = useCallback(async (tk: string, id: string): Promise<void> => {
    try {
      const updated = await apiFetch(`/admin/reports/${id}`, AdminReportItem, {
        token: tk,
      });
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      /* keep existing row — next full list load will sync */
    }
  }, []);

  async function runAdminAction(path: string, body: Record<string, unknown>): Promise<boolean> {
    if (!token || actionBusy) return false;
    setActionBusy(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.status === 403) {
        setForbidden(true);
        return false;
      }
      if (!res.ok) throw new Error("admin action failed");
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function suspendTarget(userId: string, reason: string): Promise<void> {
    const ok = await runAdminAction(`/admin/users/${userId}/suspend`, { reason });
    if (ok && token && active) void refreshReport(token, active.id);
  }

  async function unsuspendTarget(userId: string, note?: string): Promise<void> {
    const ok = await runAdminAction(`/admin/users/${userId}/unsuspend`, {
      ...(note ? { note } : {}),
    });
    if (ok && token && active) void refreshReport(token, active.id);
  }

  async function takedownTarget(postId: string, reason: string): Promise<void> {
    const ok = await runAdminAction(`/admin/posts/${postId}/takedown`, { reason });
    if (ok && token && active) void refreshReport(token, active.id);
  }

  async function restoreTarget(postId: string, note?: string): Promise<void> {
    const ok = await runAdminAction(`/admin/posts/${postId}/restore`, {
      ...(note ? { note } : {}),
    });
    if (ok && token && active) void refreshReport(token, active.id);
  }

  async function reviewAppeal(
    reportId: string,
    decision: "UPHELD" | "DENIED",
    note?: string,
  ): Promise<void> {
    const ok = await runAdminAction(`/admin/reports/${reportId}/appeal/review`, {
      decision,
      ...(note ? { note } : {}),
    });
    if (ok && token) void refreshReport(token, reportId);
  }

  async function exportCsv(): Promise<void> {
    if (!token || exporting) return;
    setExporting(true);
    setError(false);
    setForbidden(false);
    try {
      const res = await fetch(
        `${API_BASE}/admin/reports/export.csv?${buildQs(filters, null, "500")}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error("Export failed");

      const blob = new Blob([await res.text()], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "moderation-reports.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setExporting(false);
    }
  }

  if (forbidden) {
    return (
      <main className="mx-auto w-full max-w-[1128px] px-4 py-6">
        <Surface variant="tinted" padding="8">
          <h1 className="text-ink text-lg font-semibold">{t("forbiddenTitle")}</h1>
          <p className="text-ink-muted mt-1 text-sm">{t("forbiddenBody")}</p>
        </Surface>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-[1128px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">
        <header className="mb-4">
          <h1 className="text-ink text-xl font-semibold">{t("title")}</h1>
          <p className="text-ink-muted text-sm">{t("description")}</p>
        </header>

        <Surface variant="flat" padding="4" className="mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="border-line-soft bg-surface-subtle flex rounded-md border p-1">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={filters.status === status}
                  onClick={() => setFilters((f) => ({ ...f, status }))}
                  className={
                    filters.status === status
                      ? "text-brand-700 bg-surface rounded px-3 py-1 text-sm font-semibold"
                      : "text-ink-muted hover:text-ink rounded px-3 py-1 text-sm"
                  }
                >
                  {t(`status.${status}`)}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="text-ink-muted mb-1 block text-xs">{t("reason")}</span>
              <select
                value={filters.reason}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    reason: e.currentTarget.value as ReportReasonValue | "",
                  }))
                }
                className="border-line-hard bg-surface text-ink rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">{t("allReasons")}</option>
                {REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {tReason(reason)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-ink-muted mb-1 block text-xs">{t("targetKind")}</span>
              <select
                value={filters.targetKind}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    targetKind: e.currentTarget.value as TargetKind | "",
                  }))
                }
                className="border-line-hard bg-surface text-ink rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">{t("allTargets")}</option>
                {TARGET_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`targetKinds.${kind}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-ink-muted mb-1 block text-xs">{t("reporterFilter")}</span>
              <input
                value={filters.reporter}
                onChange={(e) => setFilters((f) => ({ ...f, reporter: e.currentTarget.value }))}
                type="search"
                className="border-line-hard bg-surface text-ink w-44 rounded-md border px-3 py-1.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-ink-muted mb-1 block text-xs">{t("resolverFilter")}</span>
              <input
                value={filters.resolver}
                onChange={(e) => setFilters((f) => ({ ...f, resolver: e.currentTarget.value }))}
                type="search"
                className="border-line-hard bg-surface text-ink w-44 rounded-md border px-3 py-1.5 text-sm"
              />
            </label>

            <DateInput
              label={t("createdFrom")}
              value={filters.createdFrom}
              onChange={(value) => setFilters((f) => ({ ...f, createdFrom: value }))}
            />
            <DateInput
              label={t("createdTo")}
              value={filters.createdTo}
              onChange={(value) => setFilters((f) => ({ ...f, createdTo: value }))}
            />
            <DateInput
              label={t("resolvedFrom")}
              value={filters.resolvedFrom}
              onChange={(value) => setFilters((f) => ({ ...f, resolvedFrom: value }))}
            />
            <DateInput
              label={t("resolvedTo")}
              value={filters.resolvedTo}
              onChange={(value) => setFilters((f) => ({ ...f, resolvedTo: value }))}
            />

            <button
              type="button"
              disabled={!token || exporting}
              onClick={() => void exportCsv()}
              className="border-line-hard bg-surface text-ink hover:bg-surface-subtle rounded-md border px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
            >
              {exporting ? t("exporting") : t("exportCsv")}
            </button>
          </div>
        </Surface>

        {loading && items.length === 0 ? (
          <Surface variant="tinted" padding="6">
            <p className="text-ink-muted text-sm">{t("loading")}</p>
          </Surface>
        ) : null}

        {error ? (
          <Surface variant="tinted" padding="6">
            <p role="alert" className="text-danger text-sm">
              {t("genericError")}
            </p>
          </Surface>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <Surface variant="tinted" padding="8">
            <p className="text-ink text-sm font-semibold">{t("emptyTitle")}</p>
            <p className="text-ink-muted mt-1 text-sm">{t("emptyBody")}</p>
          </Surface>
        ) : null}

        {items.length > 0 ? (
          <>
            <Surface variant="flat" padding="0">
              <ul className="divide-line-soft divide-y">
                {items.map((report) => (
                  <li key={report.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(report.id)}
                      className={
                        active?.id === report.id
                          ? "bg-brand-50 block w-full px-4 py-3 text-start"
                          : "hover:bg-surface-subtle block w-full px-4 py-3 text-start"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-ink truncate text-sm font-semibold">
                            {t(`targetKinds.${report.targetKind}`)} · {tReason(report.reason)}
                          </p>
                          <p className="text-ink-muted mt-1 line-clamp-2 text-sm">
                            {report.target.excerpt ?? report.details ?? report.target.label}
                          </p>
                        </div>
                        <time
                          dateTime={report.createdAt}
                          className="text-ink-muted shrink-0 text-xs"
                        >
                          {new Date(report.createdAt).toLocaleDateString()}
                        </time>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Surface>

            {hasMore ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  disabled={loading || !cursor || !token}
                  onClick={() => token && cursor && void load(token, cursor, filters)}
                  className="border-line-hard bg-surface text-ink hover:bg-surface-subtle rounded-md border px-4 py-1.5 text-sm disabled:opacity-60"
                >
                  {loading ? t("loading") : t("loadMore")}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Surface variant="card" padding="5">
          {active ? (
            <ReportDetail
              report={active}
              note={resolveNote}
              resolving={resolving}
              onNote={setResolveNote}
              onResolve={() => void resolve(active)}
              actionBusy={actionBusy}
              onSuspend={(reason) => void suspendTarget(active.targetId, reason)}
              onUnsuspend={(note) => void unsuspendTarget(active.targetId, note)}
              onTakedown={(reason) => void takedownTarget(active.targetId, reason)}
              onRestore={(note) => void restoreTarget(active.targetId, note)}
              onReviewAppeal={(decision, note) => void reviewAppeal(active.id, decision, note)}
            />
          ) : (
            <p className="text-ink-muted text-sm">{t("selectPrompt")}</p>
          )}
        </Surface>
      </aside>
    </main>
  );
}

function ReportDetail({
  report,
  note,
  resolving,
  onNote,
  onResolve,
  actionBusy,
  onSuspend,
  onUnsuspend,
  onTakedown,
  onRestore,
  onReviewAppeal,
}: {
  report: AdminReport;
  note: string;
  resolving: boolean;
  onNote(value: string): void;
  onResolve(): void;
  actionBusy: boolean;
  onSuspend(reason: string): void;
  onUnsuspend(note?: string): void;
  onTakedown(reason: string): void;
  onRestore(note?: string): void;
  onReviewAppeal(decision: "UPHELD" | "DENIED", note?: string): void;
}): JSX.Element {
  const t = useTranslations("admin.moderation");
  const tReason = useTranslations("moderation.reportDialog.reasons");
  const [actionReason, setActionReason] = useState("");
  const [appealNoteDraft, setAppealNoteDraft] = useState("");

  const targetAvailable = report.target.state === "available";
  const isUser = report.targetKind === "USER";
  const isPost = report.targetKind === "POST";
  const appealPending = report.appealStatus === "PENDING";

  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
          {t(`targetKinds.${report.targetKind}`)}
        </p>
        <h2 className="text-ink mt-1 text-lg font-semibold">{tReason(report.reason)}</h2>
      </header>

      <InfoRow label={t("reporter")} value={actorLabel(report.reporter)} />
      <InfoRow label={t("createdAt")} value={new Date(report.createdAt).toLocaleString()} />

      <section>
        <h3 className="text-ink mb-2 text-sm font-semibold">{t("target")}</h3>
        {report.target.state === "available" ? (
          <div className="bg-surface-subtle rounded-md p-3">
            {report.target.author ? (
              <div className="mb-2 flex items-center gap-2">
                <Avatar user={report.target.author} size="xs" />
                <span className="text-ink min-w-0 truncate text-sm font-medium">
                  {actorLabel(report.target.author)}
                </span>
              </div>
            ) : null}
            <p className="text-ink text-sm">{report.target.excerpt ?? report.target.label}</p>
          </div>
        ) : (
          <p className="bg-surface-subtle text-ink-muted rounded-md p-3 text-sm">
            {t("unavailable")}
          </p>
        )}
      </section>

      <section>
        <h3 className="text-ink mb-1 text-sm font-semibold">{t("details")}</h3>
        <p className="text-ink-muted whitespace-pre-wrap text-sm">
          {report.details || t("noDetails")}
        </p>
      </section>

      {report.resolvedAt ? (
        <section className="border-success/30 bg-success/10 rounded-md border p-3">
          <InfoRow label={t("resolvedAt")} value={new Date(report.resolvedAt).toLocaleString()} />
          <InfoRow
            label={t("resolvedBy")}
            value={report.resolvedBy ? actorLabel(report.resolvedBy) : t("unknown")}
          />
          {report.resolvedNote ? (
            <p className="text-ink-muted mt-2 whitespace-pre-wrap text-sm">{report.resolvedNote}</p>
          ) : null}
        </section>
      ) : null}

      {targetAvailable && (isUser || isPost) ? (
        <section className="border-line-soft rounded-md border p-3">
          <h3 className="text-ink mb-2 text-sm font-semibold">{t("adminActions")}</h3>
          <label className="block">
            <span className="text-ink-muted mb-1 block text-xs">{t("adminActionReason")}</span>
            <input
              value={actionReason}
              onChange={(e) => setActionReason(e.currentTarget.value)}
              maxLength={500}
              className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
              data-testid="admin-action-reason"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {isUser ? (
              <>
                <button
                  type="button"
                  disabled={actionBusy || !actionReason.trim()}
                  onClick={() => onSuspend(actionReason.trim())}
                  className="bg-danger text-ink-inverse rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                  data-testid="admin-suspend"
                >
                  {t("suspend")}
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => onUnsuspend(actionReason.trim() || undefined)}
                  className="border-line-hard bg-surface text-ink rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                  data-testid="admin-unsuspend"
                >
                  {t("unsuspend")}
                </button>
              </>
            ) : null}
            {isPost ? (
              <>
                <button
                  type="button"
                  disabled={actionBusy || !actionReason.trim()}
                  onClick={() => onTakedown(actionReason.trim())}
                  className="bg-danger text-ink-inverse rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                  data-testid="admin-takedown"
                >
                  {t("takedown")}
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => onRestore(actionReason.trim() || undefined)}
                  className="border-line-hard bg-surface text-ink rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                  data-testid="admin-restore"
                >
                  {t("restore")}
                </button>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {report.appealStatus ? (
        <section className="border-line-soft rounded-md border p-3">
          <h3 className="text-ink mb-2 text-sm font-semibold">{t("appeal")}</h3>
          <InfoRow
            label={t("appealStatus")}
            value={t(`appealStatusValues.${report.appealStatus}`)}
          />
          {report.appealedAt ? (
            <InfoRow label={t("appealedAt")} value={new Date(report.appealedAt).toLocaleString()} />
          ) : null}
          {report.appealNote ? (
            <p className="text-ink mt-2 whitespace-pre-wrap text-sm">{report.appealNote}</p>
          ) : null}
          {report.appealReviewedAt ? (
            <InfoRow
              label={t("appealReviewedAt")}
              value={new Date(report.appealReviewedAt).toLocaleString()}
            />
          ) : null}
          {report.appealDecisionNote ? (
            <p className="text-ink-muted mt-2 whitespace-pre-wrap text-sm">
              {report.appealDecisionNote}
            </p>
          ) : null}
          {appealPending ? (
            <div className="mt-3 flex flex-col gap-2">
              <label className="block">
                <span className="text-ink-muted mb-1 block text-xs">{t("appealDecisionNote")}</span>
                <textarea
                  value={appealNoteDraft}
                  onChange={(e) => setAppealNoteDraft(e.currentTarget.value)}
                  rows={2}
                  maxLength={1000}
                  className="border-line-hard bg-surface text-ink w-full resize-y rounded-md border px-3 py-1.5 text-sm"
                  data-testid="admin-appeal-note"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => onReviewAppeal("UPHELD", appealNoteDraft.trim() || undefined)}
                  className="bg-brand-600 text-ink-inverse rounded-md px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                  data-testid="admin-appeal-uphold"
                >
                  {t("appealUphold")}
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => onReviewAppeal("DENIED", appealNoteDraft.trim() || undefined)}
                  className="border-line-hard bg-surface text-ink rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
                  data-testid="admin-appeal-deny"
                >
                  {t("appealDeny")}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {!report.resolvedAt ? (
        <section>
          <label className="block">
            <span className="text-ink mb-1 block text-sm font-semibold">{t("resolveNote")}</span>
            <textarea
              value={note}
              onChange={(e) => onNote(e.currentTarget.value)}
              maxLength={1000}
              rows={4}
              className="border-line-hard bg-surface text-ink w-full resize-y rounded-md border px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={resolving}
            onClick={onResolve}
            className="bg-brand-600 text-ink-inverse mt-3 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {resolving ? t("resolving") : t("resolve")}
          </button>
        </section>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt className="text-ink-muted text-xs font-semibold uppercase tracking-wide">{label}</dt>
      <dd className="text-ink mt-1 text-sm">{value}</dd>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-ink-muted mb-1 block text-xs">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className="border-line-hard bg-surface text-ink rounded-md border px-3 py-1.5 text-sm"
      />
    </label>
  );
}

function actorLabel(actor: AdminReport["reporter"]): string {
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ");
  return name || actor.handle || actor.userId;
}

function addDateFilter(
  qs: URLSearchParams,
  key: string,
  value: string,
  edge: "start" | "end",
): void {
  if (!value) return;
  const suffix = edge === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
  qs.set(key, new Date(`${value}${suffix}`).toISOString());
}
