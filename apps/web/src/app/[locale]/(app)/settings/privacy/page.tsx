"use client";

// Settings → Privacy. Closes the gap noted in
// design-handoff-2026-05/PRODUCT-HEALTH.md §2.
//
// Server endpoints:
//   GET    /me/privacy   → PrivacySettings
//   PATCH  /me/privacy   → 204
//
// Structure intentionally mirrors /settings/notifications/page.tsx — same
// session bootstrap, same dirty-state sticky save bar, same retry-on-error,
// same `apiFetch + apiCall` split. If we hoist this pattern into a hook
// (useEditablePrefs<T>) the two pages should collapse to ~40 lines each.

import {
  PrivacySettings as PrivacySettingsSchema,
  type PrivacySettings,
  type PrivacyVisibility,
} from "@baydar/shared";
import { Button, RadioGroup, Surface, Switch, useToast } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiCall, apiFetch } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";

type SettingKey =
  | "profileVisibility"
  | "whoCanMessage"
  | "whoCanSeeConnections"
  | "whoCanSeeContact"
  | "appearInSearch"
  | "appearInSuggestions";

// Each setting has its own valid option set. Keep these as data so we can
// generate the form and Tab keys at runtime without hand-rolling JSX per row.
const SETTINGS: ReadonlyArray<{ key: SettingKey; options: readonly PrivacyVisibility[] }> = [
  { key: "profileVisibility", options: ["public", "connections", "private"] },
  { key: "whoCanMessage", options: ["anyone", "connections"] },
  { key: "whoCanSeeConnections", options: ["public", "connections", "private"] },
  { key: "whoCanSeeContact", options: ["connections", "private"] },
];

const TOGGLES: ReadonlyArray<{ key: SettingKey }> = [
  { key: "appearInSearch" },
  { key: "appearInSuggestions" },
];

export default function PrivacySettingsPage(): JSX.Element {
  const t = useTranslations("settings.privacy");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PrivacySettings | null>(null);
  const [pristine, setPristine] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  const fetchPrefs = useCallback(
    async (tk: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch("/me/privacy", PrivacySettingsSchema, { token: tk });
        setPrefs(data);
        setPristine(data);
      } catch (e) {
        setError(toErrorMessage(e, tErr));
      } finally {
        setLoading(false);
      }
    },
    [tErr],
  );

  useEffect(() => {
    if (!token) return;
    void fetchPrefs(token);
  }, [token, fetchPrefs]);

  const setVisibility = (key: SettingKey, value: PrivacyVisibility): void => {
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const setToggle = (key: SettingKey, value: boolean): void => {
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const isDirty = useMemo(
    () => prefs !== null && pristine !== null && JSON.stringify(prefs) !== JSON.stringify(pristine),
    [prefs, pristine],
  );

  const onSave = async (): Promise<void> => {
    if (!token || !prefs) return;
    setSaving(true);
    try {
      await apiCall("/me/privacy", { token, method: "PATCH", body: prefs });
      setPristine(prefs);
      toast.showToast({ message: t("savedToast"), kind: "success" });
    } catch (e) {
      toast.showToast({ message: toErrorMessage(e, tErr), kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("subtitle")}</p>
      </header>

      {loading ? (
        <PrefsSkeleton />
      ) : error ? (
        <Surface
          variant="tinted"
          padding="6"
          className="flex flex-col items-center gap-3 text-center"
        >
          <p className="text-ink-muted text-sm">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => token && void fetchPrefs(token)}>
            {tCommon("retry")}
          </Button>
        </Surface>
      ) : prefs ? (
        <>
          <Surface variant="card" padding="0">
            <ul>
              {SETTINGS.map((s, i) => (
                <li
                  key={s.key}
                  className={
                    "flex flex-col gap-3 px-4 py-4" + (i > 0 ? " border-line-soft border-t" : "")
                  }
                >
                  <div>
                    <div className="text-ink text-sm font-semibold">
                      {t(`fields.${s.key}.title`)}
                    </div>
                    <div className="text-ink-muted mt-0.5 text-xs">{t(`fields.${s.key}.desc`)}</div>
                  </div>
                  <RadioGroup
                    value={prefs[s.key] as PrivacyVisibility}
                    onValueChange={(value) => setVisibility(s.key, value as PrivacyVisibility)}
                    items={s.options.map((opt) => ({
                      value: opt,
                      label: t(`options.${opt}`),
                    }))}
                  />
                </li>
              ))}
            </ul>
          </Surface>

          <Surface variant="card" padding="0">
            <header className="px-4 py-3">
              <h2 className="text-ink text-sm font-semibold">{t("discoverabilityTitle")}</h2>
              <p className="text-ink-muted mt-0.5 text-xs">{t("discoverabilityDesc")}</p>
            </header>
            <div className="border-line-soft border-t" />
            <ul>
              {TOGGLES.map((s, i) => (
                <li
                  key={s.key}
                  className={
                    "flex items-center justify-between gap-4 px-4 py-3" +
                    (i > 0 ? " border-line-soft border-t" : "")
                  }
                >
                  <div className="min-w-0">
                    <div className="text-ink text-sm font-medium">{t(`fields.${s.key}.title`)}</div>
                    <div className="text-ink-muted mt-0.5 text-xs">{t(`fields.${s.key}.desc`)}</div>
                  </div>
                  <Switch
                    checked={Boolean(prefs[s.key])}
                    onChange={(v) => setToggle(s.key, v)}
                    ariaLabel={t(`fields.${s.key}.title`)}
                  />
                </li>
              ))}
            </ul>
          </Surface>

          {isDirty ? (
            <div
              role="region"
              aria-label={tCommon("unsavedChanges")}
              className="border-line-soft bg-surface shadow-pop sticky bottom-4 flex items-center justify-end gap-2 rounded-lg border p-3"
            >
              <span className="text-ink-muted me-auto text-sm">{tCommon("unsavedChanges")}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPrefs(pristine)}
                disabled={saving}
              >
                {tCommon("revert")}
              </Button>
              <Button variant="primary" size="sm" loading={saving} onClick={() => void onSave()}>
                {saving ? tCommon("saving") : tCommon("save")}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function PrefsSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Surface variant="card" padding="0">
        <ul>
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className={
                "flex flex-col gap-3 px-4 py-4" + (i > 0 ? " border-line-soft border-t" : "")
              }
            >
              <div className="flex flex-col gap-1.5">
                <div className="bg-surface-sunken h-3.5 w-40 animate-pulse rounded" />
                <div className="bg-surface-sunken h-3 w-52 animate-pulse rounded" />
              </div>
              <div className="flex gap-2">
                <div className="bg-surface-sunken h-6 w-20 animate-pulse rounded-full" />
                <div className="bg-surface-sunken h-6 w-24 animate-pulse rounded-full" />
                <div className="bg-surface-sunken h-6 w-16 animate-pulse rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}
