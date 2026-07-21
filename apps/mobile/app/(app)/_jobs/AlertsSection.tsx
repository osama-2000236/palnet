// Job alerts inside the mobile filter sheet — save the current filter set as
// an alert (in-app + push on match), list existing alerts, delete. Web twin:
// jobs/_components/JobAlertsPanel.tsx.

import { JobAlert, type JobAlert as JobAlertType } from "@baydar/shared";
import { Button, Icon, nativeTokens, useThemeTokens, type NativeTheme } from "@baydar/ui-native";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { z } from "zod";

import { apiCall, apiFetch } from "@/lib/api";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

import type { Filters } from "./filters";

// apiFetch unwraps the `{ data }` envelope itself — schemas describe the payload.
const AlertList = z.array(JobAlert);

export function AlertsSection({ filters }: { filters: Filters }): JSX.Element {
  const styles = useStyles();
  const c = useThemeTokens().color;
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<JobAlertType[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        const out = await apiFetch("/jobs/alerts", AlertList, { token });
        if (!cancelled) setAlerts(out);
      } catch {
        // Sheet extra — load failure just leaves the list empty.
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, []);

  const hasFilters = Boolean(
    filters.q || filters.city || filters.type || filters.locationMode || filters.industry,
  );

  const createAlert = useCallback(async (): Promise<void> => {
    if (busy) return;
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      tapHaptic();
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
      successHaptic();
    } catch {
      setError(t("jobs.alerts.error"));
    } finally {
      setBusy(false);
    }
  }, [busy, filters, t]);

  const removeAlert = useCallback(
    async (id: string): Promise<void> => {
      const token = await getAccessToken();
      if (!token) return;
      const previous = alerts;
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      try {
        await apiCall(`/jobs/alerts/${id}`, { method: "DELETE", token });
      } catch {
        setAlerts(previous);
        setError(t("jobs.alerts.error"));
      }
    },
    [alerts, t],
  );

  const summarize = (alert: JobAlertType): string =>
    [
      alert.q,
      alert.city,
      alert.type ? t(`jobs.typeLabels.${alert.type}`) : null,
      alert.locationMode ? t(`jobs.locationLabels.${alert.locationMode}`) : null,
      alert.industry,
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <View style={{ gap: nativeTokens.space[2] }}>
      <Button
        variant="secondary"
        size="md"
        fullWidth
        disabled={!hasFilters}
        loading={busy}
        onPress={() => void createAlert()}
        leading={<Icon name="bell" size={16} color={c.ink} />}
      >
        {t("jobs.alerts.create")}
      </Button>
      {!hasFilters ? <Text style={styles.hint}>{t("jobs.alerts.hint")}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {alerts.map((alert) => (
        <View key={alert.id} style={styles.row}>
          <Text style={styles.rowText} numberOfLines={2}>
            {summarize(alert)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("jobs.alerts.deleteAria")}
            hitSlop={nativeTokens.space[2]}
            style={styles.deleteButton}
            onPress={() => void removeAlert(alert.id)}
          >
            <Icon name="x" size={16} color={c.inkMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return {
    hint: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
    },
    error: {
      color: c.danger,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: nativeTokens.space[2],
      borderWidth: 1,
      borderColor: c.lineSoft,
      borderRadius: nativeTokens.radius.md,
      padding: nativeTokens.space[2],
    },
    rowText: {
      flex: 1,
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.caption.size,
      lineHeight: nativeTokens.type.scale.caption.line,
    },
    deleteButton: {
      width: nativeTokens.space[8],
      height: nativeTokens.space[8],
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  };
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}

// expo-router colocation: not a screen.
export default (): null => null;
