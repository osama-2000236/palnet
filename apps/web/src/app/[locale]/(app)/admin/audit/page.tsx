"use client";

import {
  AuditAction,
  AuditLogPage,
  type AuditAction as AuditActionValue,
  type AuditLogItem,
} from "@palnet/shared";
import { Surface } from "@palnet/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { ApiRequestError, apiFetchPage } from "@/lib/api";
import { readSession } from "@/lib/session";

const ACTIONS = Object.values(AuditAction) as AuditActionValue[];
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Filters = {
  action: AuditActionValue | "";
  actor: string;
  targetUserId: string;
  targetPostId: string;
  targetReportId: string;
  createdFrom: string;
  createdTo: string;
};

const EMPTY_FILTERS: Filters = {
  action: "",
  actor: "",
  targetUserId: "",
  targetPostId: "",
  targetReportId: "",
  createdFrom: "",
  createdTo: "",
};

function buildQs(filters: Filters, after: string | null, limit = "50"): string {
  const qs = new URLSearchParams({ limit });
  if (after) qs.set("after", after);
  if (filters.action) qs.set("action", filters.action);
  if (filters.actor) qs.set("actor", filters.actor);
  if (filters.targetUserId) qs.set("targetUserId", filters.targetUserId);
  if (filters.targetPostId) qs.set("targetPostId", filters.targetPostId);
  if (filters.targetReportId) qs.set("targetReportId", filters.targetReportId);
  if (filters.createdFrom) {
    qs.set("createdFrom", new Date(`${filters.createdFrom}T00:00:00.000Z`).toISOString());
  }
  if (filters.createdTo) {
    qs.set("createdTo", new Date(`${filters.createdTo}T23:59:59.999Z`).toISOString());
  }
  return qs.toString();
}

export default function AdminAuditPage(): JSX.Element {
  const t = useTranslations("admin.audit");
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  const load = useCallback(async (tk: string, after: string | null, nextFilters: Filters) => {
    setLoading(true);
    setError(false);
    setForbidden(false);
    try {
      const page = await apiFetchPage(`/admin/audit?${buildQs(nextFilters, after)}`, AuditLogPage, {
        token: tk,
      });
      setItems((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 403) setForbidden(true);
      else setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void load(token, null, filters);
  }, [token, filters, load]);

  async function exportCsv(): Promise<void> {
    if (!token || exporting) return;
    setExporting(true);
    setError(false);
    setForbidden(false);
    try {
      const res = await fetch(
        `${API_BASE}/admin/audit/export.csv?${buildQs(filters, null, "500")}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error("export failed");
      const blob = new Blob([await res.text()], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "audit-log.csv";
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
    <main className="mx-auto w-full max-w-[1128px] px-4 py-6">
      <header className="mb-4">
        <h1 className="text-ink text-xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("description")}</p>
      </header>

      <Surface variant="flat" padding="4" className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-ink-muted mb-1 block text-xs">{t("action")}</span>
            <select
              value={filters.action}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  action: e.currentTarget.value as AuditActionValue | "",
                }))
              }
              className="border-line-hard bg-surface text-ink rounded-md border px-3 py-1.5 text-sm"
            >
              <option value="">{t("allActions")}</option>
              {ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {t(`actions.${action}`)}
                </option>
              ))}
            </select>
          </label>

          <TextFilter
            label={t("actor")}
            value={filters.actor}
            onChange={(actor) => setFilters((f) => ({ ...f, actor }))}
          />
          <TextFilter
            label={t("targetUserId")}
            value={filters.targetUserId}
            onChange={(targetUserId) => setFilters((f) => ({ ...f, targetUserId }))}
          />
          <TextFilter
            label={t("targetPostId")}
            value={filters.targetPostId}
            onChange={(targetPostId) => setFilters((f) => ({ ...f, targetPostId }))}
          />
          <TextFilter
            label={t("targetReportId")}
            value={filters.targetReportId}
            onChange={(targetReportId) => setFilters((f) => ({ ...f, targetReportId }))}
          />
          <DateInput
            label={t("createdFrom")}
            value={filters.createdFrom}
            onChange={(createdFrom) => setFilters((f) => ({ ...f, createdFrom }))}
          />
          <DateInput
            label={t("createdTo")}
            value={filters.createdTo}
            onChange={(createdTo) => setFilters((f) => ({ ...f, createdTo }))}
          />

          <button
            type="button"
            disabled={!token || exporting}
            onClick={() => void exportCsv()}
            className="border-line-hard bg-surface text-ink hover:bg-surface-subtle rounded-md border px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
            data-testid="audit-export-csv"
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
        <Surface variant="flat" padding="0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-muted border-line-soft border-b text-start text-xs uppercase tracking-wide">
                <th scope="col" className="px-4 py-2 text-start">
                  {t("when")}
                </th>
                <th scope="col" className="px-4 py-2 text-start">
                  {t("action")}
                </th>
                <th scope="col" className="px-4 py-2 text-start">
                  {t("actor")}
                </th>
                <th scope="col" className="px-4 py-2 text-start">
                  {t("target")}
                </th>
                <th scope="col" className="px-4 py-2 text-start">
                  {t("note")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-line-soft divide-y">
              {items.map((row) => (
                <tr key={row.id} data-testid={`audit-row-${row.id}`}>
                  <td className="px-4 py-2 align-top">
                    <time dateTime={row.createdAt} className="text-ink-muted text-xs">
                      {new Date(row.createdAt).toLocaleString()}
                    </time>
                  </td>
                  <td className="px-4 py-2 align-top text-xs font-semibold uppercase tracking-wide">
                    {t(`actions.${row.action}`)}
                  </td>
                  <td className="text-ink px-4 py-2 align-top">{actorLabel(row.actor)}</td>
                  <td className="px-4 py-2 align-top text-xs">
                    {row.targetUserId ? (
                      <div>
                        user:{" "}
                        <a
                          className="text-brand-700 underline"
                          href={`/admin/users/${row.targetUserId}`}
                        >
                          {row.targetUserId}
                        </a>
                      </div>
                    ) : null}
                    {row.targetPostId ? (
                      <div>
                        post:{" "}
                        <a
                          className="text-brand-700 underline"
                          href={`/admin/posts/${row.targetPostId}`}
                        >
                          {row.targetPostId}
                        </a>
                      </div>
                    ) : null}
                    {row.targetReportId ? <div>report: {row.targetReportId}</div> : null}
                  </td>
                  <td className="text-ink-muted px-4 py-2 align-top">{row.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Surface>
      ) : null}

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
    </main>
  );
}

function actorLabel(actor: AuditLogItem["actor"]): string {
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ");
  return name || actor.handle || actor.userId;
}

function TextFilter({
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
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        type="search"
        className="border-line-hard bg-surface text-ink w-44 rounded-md border px-3 py-1.5 text-sm"
      />
    </label>
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
