"use client";

// Job alerts rail card — save the current filter set as an alert; the API
// notifies (in-app + push) when a matching job is published. Sits under
// <JobFilters> in the jobs rail.

import { JobAlert, type JobAlert as JobAlertType } from "@baydar/shared";
import { Button, Icon, Surface, useToast } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { apiCall, apiFetch } from "@/lib/api";
import type { JobFiltersState } from "./JobFilters";

// apiFetch unwraps the `{ data }` envelope itself — schemas describe the payload.
const AlertList = z.array(JobAlert);

export function JobAlertsPanel({
  token,
  filters,
}: {
  token: string | null;
  filters: JobFiltersState;
}): JSX.Element {
  const t = useTranslations("jobs");
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState<JobAlertType[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void apiFetch("/jobs/alerts", AlertList, { token })
      .then((out) => {
        if (!cancelled) setAlerts(out);
      })
      .catch(() => {
        // Rail extra — a load failure just leaves the list empty.
      });
    return (): void => {
      cancelled = true;
    };
  }, [token]);

  const hasFilters = Boolean(
    filters.q || filters.city || filters.type || filters.locationMode || filters.industry,
  );

  const createAlert = useCallback(async (): Promise<void> => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const created = await apiFetch("/jobs/alerts", JobAlert, {
        method: "POST",
        token,
        body: {
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.city ? { city: filters.city } : {}),
          ...(filters.type ? { type: filters.type } : {}),
          ...(filters.locationMode ? { locationMode: filters.locationMode } : {}),
          ...(filters.industry ? { industry: filters.industry } : {}),
        },
      });
      setAlerts((prev) => [created, ...prev]);
      showToast({ kind: "success", message: t("alerts.createdToast") });
    } catch {
      showToast({ kind: "error", message: t("alerts.errorToast") });
    } finally {
      setBusy(false);
    }
  }, [token, busy, filters, showToast, t]);

  const removeAlert = useCallback(
    async (id: string): Promise<void> => {
      if (!token) return;
      const previous = alerts;
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      try {
        await apiCall(`/jobs/alerts/${id}`, { method: "DELETE", token });
      } catch {
        setAlerts(previous);
        showToast({ kind: "error", message: t("alerts.errorToast") });
      }
    },
    [token, alerts, showToast, t],
  );

  const summarize = (alert: JobAlertType): string =>
    [
      alert.q,
      alert.city,
      alert.type ? t(`typeLabels.${alert.type}`) : null,
      alert.locationMode ? t(`locationLabels.${alert.locationMode}`) : null,
      alert.industry,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <Surface variant="card" padding="4" className="mt-4" as="aside" aria-label={t("alerts.title")}>
      <h2 className="text-ink mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Icon name="bell" size={14} aria-hidden="true" />
        {t("alerts.title")}
      </h2>
      <Button
        variant="secondary"
        size="sm"
        fullWidth
        disabled={!hasFilters}
        loading={busy}
        onClick={() => void createAlert()}
      >
        {t("alerts.create")}
      </Button>
      {!hasFilters ? <p className="text-ink-muted mt-2 text-xs">{t("alerts.hint")}</p> : null}
      {alerts.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="border-line-soft flex items-start justify-between gap-2 rounded-md border p-2"
            >
              <p className="text-ink min-w-0 break-words text-xs leading-5">{summarize(alert)}</p>
              <button
                type="button"
                aria-label={t("alerts.deleteAria")}
                title={t("alerts.deleteAria")}
                className="text-ink-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-hidden flex h-7 w-7 flex-none items-center justify-center rounded-md focus-visible:[box-shadow:var(--focus-ring)]"
                onClick={() => void removeAlert(alert.id)}
              >
                <Icon name="x" size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Surface>
  );
}
