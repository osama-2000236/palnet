"use client";

// Settings — Notifications.
// Email + push preference matrix per event type. Closes the gap noted in
// docs/design/PRODUCT-HEALTH-2026-05-16.md §2: transactional email cannot
// ship until users have a way to opt in/out.
//
// Server endpoints:
//   GET    /me/notification-preferences  → NotificationPreferences
//   PATCH  /me/notification-preferences  → 204 No Content
//
// Naming + structure mirrors apps/web/src/app/[locale]/(app)/jobs/page.tsx
// (session bootstrap → fetch → skeleton/error/data states) and
// apps/web/src/app/[locale]/(app)/settings/account/page.tsx (form-edit shape).

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences as NotificationPreferencesSchema,
  type NotificationPreferences,
} from "@baydar/shared";
import { Button, Surface, Switch, useToast } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiCall, apiFetch } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";
import { ChannelHeader, PrefsSkeleton } from "./_components/NotificationSettingsParts";

// Each notification "event" can be turned on/off for two channels.
type Channel = "email" | "push";

type EventKey =
  | "newConnection"
  | "newMessage"
  | "newComment"
  | "newReaction"
  | "jobMatch"
  | "applicationStatus"
  | "weeklyDigest"
  | "karamaUpdate"
  | "moderationAction";

interface EventGroup {
  key: string;
  events: EventKey[];
}

const EVENT_GROUPS: EventGroup[] = [
  { key: "social", events: ["newConnection", "newMessage", "newComment", "newReaction"] },
  { key: "career", events: ["jobMatch", "applicationStatus"] },
  { key: "account", events: ["weeklyDigest", "karamaUpdate", "moderationAction"] },
];

const LOCKED_EVENTS: ReadonlySet<EventKey> = new Set(["moderationAction"]);

function enforceLockedPrefs(prefs: NotificationPreferences): NotificationPreferences {
  return {
    ...prefs,
    moderationAction: { ...DEFAULT_NOTIFICATION_PREFERENCES.moderationAction },
  };
}

export default function NotificationsSettingsPage(): JSX.Element {
  const t = useTranslations("settings.notifications");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [pristine, setPristine] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Session bootstrap — matches feed/page.tsx pattern.
  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  // Initial fetch.
  const fetchPrefs = useCallback(
    async (tk: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch("/me/notification-preferences", NotificationPreferencesSchema, {
          token: tk,
        });
        const next = enforceLockedPrefs(data);
        setPrefs(next);
        setPristine(next);
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

  // Local mutations — saved as a single PATCH on confirm.
  const setChannel = (event: EventKey, channel: Channel, value: boolean): void => {
    if (LOCKED_EVENTS.has(event)) return;
    setPrefs((prev) => (prev ? { ...prev, [event]: { ...prev[event], [channel]: value } } : prev));
  };

  const setAllChannel = (channel: Channel, value: boolean): void => {
    setPrefs((prev) => {
      if (!prev) return prev;
      const next: NotificationPreferences = { ...prev };
      for (const group of EVENT_GROUPS) {
        for (const ev of group.events) {
          if (LOCKED_EVENTS.has(ev)) continue;
          next[ev] = { ...next[ev], [channel]: value };
        }
      }
      return next;
    });
  };

  const isDirty = useMemo(
    () => prefs !== null && pristine !== null && JSON.stringify(prefs) !== JSON.stringify(pristine),
    [prefs, pristine],
  );

  const allEmail = useMemo(
    () => prefs !== null && EVENT_GROUPS.every((g) => g.events.every((e) => prefs[e]?.email)),
    [prefs],
  );
  const allPush = useMemo(
    () => prefs !== null && EVENT_GROUPS.every((g) => g.events.every((e) => prefs[e]?.push)),
    [prefs],
  );

  const onSave = async (): Promise<void> => {
    if (!token || !prefs) return;
    setSaving(true);
    const next = enforceLockedPrefs(prefs);
    try {
      await apiCall("/me/notification-preferences", {
        token,
        method: "PATCH",
        body: next,
      });
      setPrefs(next);
      setPristine(next);
      toast.showToast({ message: t("savedToast"), kind: "success" });
    } catch (e) {
      toast.showToast({ message: toErrorMessage(e, tErr), kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const onRevert = (): void => {
    setPrefs(pristine);
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
          {/* Master row: turn every event on/off for a single channel. */}
          <Surface variant="card" padding="0">
            <div className="grid grid-cols-[1fr_72px_72px] items-center gap-4 px-4 py-3">
              <span className="text-ink text-sm font-semibold">{t("allEvents")}</span>
              <ChannelHeader label={t("emailHeader")} />
              <ChannelHeader label={t("pushHeader")} />
            </div>
            <div className="border-line-soft border-t" />
            <div className="grid grid-cols-[1fr_72px_72px] items-center gap-4 px-4 py-3">
              <span className="text-ink-muted text-sm">{t("setAllDesc")}</span>
              <div className="flex justify-center">
                <Switch
                  checked={allEmail}
                  onChange={(v) => setAllChannel("email", v)}
                  ariaLabel={t("setAllEmail")}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={allPush}
                  onChange={(v) => setAllChannel("push", v)}
                  ariaLabel={t("setAllPush")}
                />
              </div>
            </div>
          </Surface>

          {/* Per-group rows */}
          {EVENT_GROUPS.map((group) => (
            <Surface key={group.key} variant="card" padding="0">
              <header className="px-4 py-3">
                <h2 className="text-ink text-sm font-semibold">{t(`groups.${group.key}.title`)}</h2>
                <p className="text-ink-muted mt-0.5 text-xs">{t(`groups.${group.key}.desc`)}</p>
              </header>
              <div className="border-line-soft border-t" />
              <ul>
                {group.events.map((ev, i) => {
                  const locked = LOCKED_EVENTS.has(ev);
                  return (
                    <li
                      key={ev}
                      className={
                        "grid grid-cols-[1fr_72px_72px] items-center gap-4 px-4 py-3" +
                        (i > 0 ? " border-line-soft border-t" : "")
                      }
                    >
                      <div>
                        <div className="text-ink text-sm font-medium">
                          {t(`events.${ev}.title`)}
                        </div>
                        <div className="text-ink-muted mt-0.5 text-xs">
                          {t(`events.${ev}.desc`)}
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Switch
                          checked={prefs[ev]?.email ?? false}
                          onChange={(v) => setChannel(ev, "email", v)}
                          ariaLabel={t(`events.${ev}.title`) + " · email"}
                          disabled={locked || saving}
                        />
                      </div>
                      <div className="flex justify-center">
                        <Switch
                          checked={prefs[ev]?.push ?? false}
                          onChange={(v) => setChannel(ev, "push", v)}
                          ariaLabel={t(`events.${ev}.title`) + " · push"}
                          disabled={locked || saving}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Surface>
          ))}

          {/* Sticky save bar — visible only when local state differs from pristine. */}
          {isDirty ? (
            <div
              role="region"
              aria-label={t("unsavedChanges")}
              className="border-line-soft bg-surface shadow-pop sticky bottom-4 flex items-center justify-end gap-2 rounded-lg border p-3"
            >
              <span className="text-ink-muted me-auto text-sm">{t("unsavedChanges")}</span>
              <Button variant="secondary" size="sm" onClick={onRevert} disabled={saving}>
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
