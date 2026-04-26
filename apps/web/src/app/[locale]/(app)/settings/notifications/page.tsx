"use client";

import {
  NotificationPreferences,
  type NotificationChannel,
  type NotificationEvent,
} from "@baydar/shared";
import { Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const PreferencesEnvelope = z.object({ preferences: NotificationPreferences });

const CHANNELS: NotificationChannel[] = ["inApp", "email", "push"];
const EVENTS: NotificationEvent[] = ["connections", "messages", "reactions", "comments", "jobs"];

export default function NotificationsSettingsPage(): JSX.Element {
  const t = useTranslations("settings.notifications");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        const data = await apiFetch("/notifications/preferences", PreferencesEnvelope, { token });
        setPrefs(data.preferences);
      } catch {
        setStatus("error");
      }
    })();
  }, [router]);

  function toggle(channel: NotificationChannel, event: NotificationEvent): void {
    setPrefs((p) =>
      p === null
        ? p
        : {
            ...p,
            [channel]: { ...p[channel], [event]: !p[channel][event] },
          },
    );
    setStatus("idle");
  }

  async function save(): Promise<void> {
    if (!prefs) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setStatus("idle");
    try {
      const data = await apiFetch("/notifications/preferences", PreferencesEnvelope, {
        method: "POST",
        body: prefs,
        token,
      });
      setPrefs(data.preferences);
      setStatus("ok");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-ink text-2xl font-bold md:hidden">{t("title")}</h2>
      <Surface as="section" variant="flat" padding="6">
        <header className="mb-4">
          <h2 className="text-ink text-lg font-semibold">{t("title")}</h2>
          <p className="text-ink-muted mt-1 text-sm">{t("description")}</p>
        </header>

        {prefs === null ? (
          status === "error" ? (
            <p role="alert" className="text-danger text-sm">
              {t("genericError")}
            </p>
          ) : (
            <p className="text-ink-muted text-sm">…</p>
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-ink-muted/20 border-b">
                    <th className="text-ink-muted py-2 text-start font-semibold">
                      <span className="sr-only">{t("eventColumn")}</span>
                    </th>
                    {CHANNELS.map((ch) => (
                      <th
                        key={ch}
                        scope="col"
                        className="text-ink-muted px-2 py-2 text-center font-semibold"
                      >
                        {t(`channels.${ch}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EVENTS.map((ev) => (
                    <tr key={ev} className="border-ink-muted/10 border-b last:border-0">
                      <th scope="row" className="text-ink py-3 text-start font-medium">
                        {t(`events.${ev}`)}
                      </th>
                      {CHANNELS.map((ch) => {
                        const checked = prefs[ch][ev];
                        return (
                          <td key={ch} className="px-2 py-3 text-center">
                            <label className="inline-flex items-center justify-center">
                              <span className="sr-only">
                                {`${t(`events.${ev}`)} · ${t(`channels.${ch}`)}`}
                              </span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  toggle(ch, ev);
                                }}
                                className="accent-brand-600 h-5 w-5 cursor-pointer"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {status === "ok" ? (
              <p role="status" className="text-success mt-3 text-sm">
                {t("saveOk")}
              </p>
            ) : null}
            {status === "error" ? (
              <p role="alert" className="text-danger mt-3 text-sm">
                {t("genericError")}
              </p>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void save();
                }}
                disabled={busy}
                className="bg-brand-600 text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {tCommon("save")}
              </button>
            </div>
          </>
        )}
      </Surface>
    </div>
  );
}
