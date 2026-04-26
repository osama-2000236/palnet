"use client";

// /me/appeals — the user-facing view into moderation decisions made against
// their own content. Lists resolved reports (hiding reporter identity) and
// lets the user file an appeal with a note. Suspended users can reach this
// page because the route is whitelisted in SuspensionGuard via
// @AllowSuspended() on GET /reports/mine and POST /reports/:id/appeal.

import { MyReportsPage, type MyReportItem } from "@palnet/shared";
import { Surface } from "@palnet/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { ApiRequestError, apiCall, apiFetchPage } from "@/lib/api";
import { readSession } from "@/lib/session";

type DraftState = Record<string, string>;
type BusyState = Record<string, boolean>;
type ErrorState = Record<string, string | null>;

export default function MyAppealsPage(): JSX.Element {
  const router = useRouter();
  const t = useTranslations("appeals");

  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<MyReportItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [drafts, setDrafts] = useState<DraftState>({});
  const [busy, setBusy] = useState<BusyState>({});
  const [errors, setErrors] = useState<ErrorState>({});

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  const load = useCallback(async (tk: string, after: string | null) => {
    setLoading(true);
    setListError(false);
    try {
      const qs = new URLSearchParams({ limit: "50" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(`/reports/mine?${qs.toString()}`, MyReportsPage, {
        token: tk,
      });
      setItems((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } catch {
      setListError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void load(token, null);
  }, [token, load]);

  async function submitAppeal(reportId: string): Promise<void> {
    if (!token) return;
    const note = (drafts[reportId] ?? "").trim();
    if (note.length < 10) {
      setErrors((e) => ({ ...e, [reportId]: t("errorNoteTooShort") }));
      return;
    }
    setBusy((b) => ({ ...b, [reportId]: true }));
    setErrors((e) => ({ ...e, [reportId]: null }));
    try {
      await apiCall(`/reports/${reportId}/appeal`, {
        method: "POST",
        token,
        body: { note },
      });
      // Refetch from scratch so the row re-renders with appealStatus = PENDING.
      await load(token, null);
    } catch (err) {
      const code =
        err instanceof ApiRequestError && err.code === "APPEAL_ALREADY_FILED"
          ? t("errorAlreadyFiled")
          : t("errorGeneric");
      setErrors((e) => ({ ...e, [reportId]: code }));
    } finally {
      setBusy((b) => ({ ...b, [reportId]: false }));
    }
  }

  return (
    <main className="max-w-dialog mx-auto w-full px-4 py-6">
      <header className="mb-4">
        <h1 className="text-ink text-xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("description")}</p>
      </header>

      {loading && items.length === 0 ? (
        <Surface variant="tinted" padding="6">
          <p className="text-ink-muted text-sm">{t("loading")}</p>
        </Surface>
      ) : null}

      {listError ? (
        <Surface variant="tinted" padding="6">
          <p role="alert" className="text-danger text-sm">
            {t("loadError")}
          </p>
        </Surface>
      ) : null}

      {!loading && !listError && items.length === 0 ? (
        <Surface variant="tinted" padding="8">
          <p className="text-ink text-sm font-semibold">{t("emptyTitle")}</p>
          <p className="text-ink-muted mt-1 text-sm">{t("emptyBody")}</p>
        </Surface>
      ) : null}

      <div className="flex flex-col gap-3">
        {items.map((row) => (
          <Surface key={row.id} variant="card" padding="4" data-testid={`my-appeal-${row.id}`}>
            <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-ink text-sm font-semibold">
                  {t(`targetKind.${row.targetKind}`)}
                </p>
                <p className="text-ink-muted mt-0.5 text-xs">
                  {t("resolvedAt", {
                    date: row.resolvedAt ? new Date(row.resolvedAt).toLocaleString() : "—",
                  })}
                </p>
              </div>
              <AppealBadge status={row.appealStatus} />
            </header>

            <dl className="text-ink-muted grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="font-semibold">{t("reason")}</dt>
              <dd>{t(`reasons.${row.reason}`)}</dd>
              {row.target.state === "available" && row.target.excerpt ? (
                <>
                  <dt className="font-semibold">{t("excerpt")}</dt>
                  <dd className="text-ink whitespace-pre-wrap">{row.target.excerpt}</dd>
                </>
              ) : null}
              {row.resolvedNote ? (
                <>
                  <dt className="font-semibold">{t("moderatorNote")}</dt>
                  <dd className="text-ink whitespace-pre-wrap">{row.resolvedNote}</dd>
                </>
              ) : null}
            </dl>

            {row.appealStatus ? (
              <section className="border-line-soft mt-3 border-t pt-3 text-xs">
                <p className="text-ink-muted">
                  {t("appealFiledAt", {
                    date: row.appealedAt ? new Date(row.appealedAt).toLocaleString() : "—",
                  })}
                </p>
                {row.appealNote ? (
                  <p className="text-ink mt-1 whitespace-pre-wrap">
                    <span className="font-semibold">{t("yourNote")}:</span> {row.appealNote}
                  </p>
                ) : null}
                {row.appealStatus !== "PENDING" && row.appealDecisionNote ? (
                  <p className="text-ink mt-1 whitespace-pre-wrap">
                    <span className="font-semibold">{t("reviewerNote")}:</span>{" "}
                    {row.appealDecisionNote}
                  </p>
                ) : null}
              </section>
            ) : (
              <section className="border-line-soft mt-3 border-t pt-3">
                <label className="block">
                  <span className="text-ink text-xs font-semibold">{t("noteLabel")}</span>
                  <textarea
                    value={drafts[row.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.currentTarget.value }))}
                    rows={3}
                    maxLength={2000}
                    placeholder={t("notePlaceholder")}
                    className="border-line-hard bg-surface text-ink mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                    data-testid={`my-appeal-note-${row.id}`}
                  />
                </label>
                {errors[row.id] ? (
                  <p role="alert" className="text-danger mt-1 text-xs">
                    {errors[row.id]}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={!!busy[row.id]}
                  onClick={() => void submitAppeal(row.id)}
                  className="bg-brand-600 text-ink-inverse mt-2 rounded-md px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
                  data-testid={`my-appeal-submit-${row.id}`}
                >
                  {busy[row.id] ? t("submitting") : t("submit")}
                </button>
              </section>
            )}
          </Surface>
        ))}
      </div>

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={loading || !cursor || !token}
            onClick={() => token && cursor && void load(token, cursor)}
            className="border-line-hard bg-surface text-ink hover:bg-surface-subtle rounded-md border px-4 py-1.5 text-sm disabled:opacity-60"
          >
            {loading ? t("loading") : t("loadMore")}
          </button>
        </div>
      ) : null}
    </main>
  );
}

function AppealBadge({ status }: { status: MyReportItem["appealStatus"] }): JSX.Element {
  const t = useTranslations("appeals");
  if (!status) {
    return (
      <span className="border-line-hard text-ink-muted rounded-full border px-2 py-0.5 text-xs">
        {t("statusNone")}
      </span>
    );
  }
  const tone =
    status === "PENDING"
      ? "bg-warning/15 text-warning"
      : status === "UPHELD"
        ? "bg-success/10 text-success"
        : "bg-danger/10 text-danger";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {t(`status.${status}`)}
    </span>
  );
}
