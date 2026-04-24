"use client";

import { SessionList, type SessionInfo } from "@palnet/shared";
import { Surface } from "@palnet/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiCall, apiFetch } from "@/lib/api";
import { getAccessToken, getDeviceId } from "@/lib/session";

export default function SessionsSettingsPage(): JSX.Element {
  const t = useTranslations("settings.sessions");
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(false);
    try {
      const data = await apiFetch("/account/sessions", SessionList, {
        token,
        headers: { "x-device-id": getDeviceId() },
      });
      setSessions(data.sessions);
    } catch {
      setError(true);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function revoke(id: string): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusyId(id);
    setError(false);
    try {
      await apiCall(`/account/sessions/${id}/revoke`, {
        method: "POST",
        token,
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  async function revokeAll(): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusyAll(true);
    setError(false);
    try {
      await apiCall("/account/sessions/revoke-all", {
        method: "POST",
        body: { keepDeviceId: getDeviceId() },
        token,
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusyAll(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-ink md:hidden">{t("title")}</h2>
      <Surface as="section" variant="flat" padding="6">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{t("title")}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t("description")}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void revokeAll();
            }}
            disabled={
              busyAll || !sessions || sessions.filter((s) => !s.current).length === 0
            }
            className="rounded-md border border-ink-muted/30 px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-subtle disabled:opacity-60"
          >
            {t("revokeAll")}
          </button>
        </header>

        {sessions === null && !error ? (
          <p className="text-sm text-ink-muted">…</p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {t("genericError")}
          </p>
        ) : null}

        {sessions && sessions.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("empty")}</p>
        ) : null}

        {sessions && sessions.length > 0 ? (
          <ul className="flex flex-col divide-y divide-ink-muted/15">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                busy={busyId === s.id}
                onRevoke={() => {
                  void revoke(s.id);
                }}
                currentLabel={t("current")}
                revokeLabel={t("revoke")}
              />
            ))}
          </ul>
        ) : null}
      </Surface>
    </div>
  );
}

function SessionRow({
  session,
  busy,
  onRevoke,
  currentLabel,
  revokeLabel,
}: {
  session: SessionInfo;
  busy: boolean;
  onRevoke: () => void;
  currentLabel: string;
  revokeLabel: string;
}): JSX.Element {
  const created = new Date(session.createdAt);
  const createdLabel = created.toLocaleString();
  const ua = session.userAgent ?? "";
  const device = shortUA(ua);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{device}</p>
          {session.current ? (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {currentLabel}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-ink-muted" dir="ltr">
          {session.ipAddress ?? "—"} · {createdLabel}
        </p>
      </div>
      {session.current ? null : (
        <button
          type="button"
          onClick={onRevoke}
          disabled={busy}
          className="rounded-md border border-danger/40 px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
        >
          {revokeLabel}
        </button>
      )}
    </li>
  );
}

// Parse a user-agent string into something recognizable without pulling in a
// dependency. Falls back to the raw UA prefix.
function shortUA(ua: string): string {
  if (!ua) return "Unknown device";
  const lower = ua.toLowerCase();
  const os =
    lower.includes("windows")
      ? "Windows"
      : lower.includes("mac os")
        ? "macOS"
        : lower.includes("android")
          ? "Android"
          : lower.includes("iphone") || lower.includes("ios")
            ? "iOS"
            : lower.includes("linux")
              ? "Linux"
              : "Device";
  const browser =
    lower.includes("edg/") || lower.includes("edge/")
      ? "Edge"
      : lower.includes("chrome/")
        ? "Chrome"
        : lower.includes("firefox/")
          ? "Firefox"
          : lower.includes("safari/")
            ? "Safari"
            : "Browser";
  return `${browser} · ${os}`;
}
