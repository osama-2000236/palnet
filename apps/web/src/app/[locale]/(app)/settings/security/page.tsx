"use client";

// Settings → Security. Closes the third settings-tree gap noted in
// design-handoff-2026-05/PRODUCT-HEALTH.md §2.
//
// Today /settings/account covers email + handle + export + delete account.
// This route adds the security-only surface: change password, sign out all
// other devices, and a forward-compatible 2FA panel.
//
// Server endpoints (all require Authorization):
//   POST   /auth/change-password      body { currentPassword, newPassword }
//   GET    /auth/sessions             → ActiveSession[]
//   DELETE /auth/sessions/others      → 204  ("sign out everywhere else")
//   DELETE /auth/sessions/:id         → 204
//
// Mutations all funnel through `apiCall` so 204s are handled uniformly.

import { ActiveSession as ActiveSessionSchema, type ActiveSession } from "@baydar/shared";
import { Alert, Button, Input, Surface, useToast } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { apiCall, apiFetch } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { clearSession, getDeviceId, readSession } from "@/lib/session";

const SessionsEnvelope = z.array(ActiveSessionSchema);

export default function SecuritySettingsPage(): JSX.Element {
  const t = useTranslations("settings.security");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const toast = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const thisDeviceId = getDeviceId();

  // Change-password form state.
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  const fetchSessions = useCallback(
    async (tk: string): Promise<void> => {
      setLoadingSessions(true);
      setSessionsError(null);
      try {
        const data = await apiFetch("/auth/sessions", SessionsEnvelope, { token: tk });
        setSessions(data);
      } catch (e) {
        setSessionsError(toErrorMessage(e, tErr));
      } finally {
        setLoadingSessions(false);
      }
    },
    [tErr],
  );

  useEffect(() => {
    if (!token) return;
    void fetchSessions(token);
  }, [token, fetchSessions]);

  // ── Change password ──────────────────────────────────────────────────
  const onChangePassword = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!token) return;
    setPwError(null);

    if (newPw.length < 8) {
      setPwError(t("password.tooShort"));
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(t("password.mismatch"));
      return;
    }
    if (newPw === currentPw) {
      setPwError(t("password.sameAsOld"));
      return;
    }

    setPwBusy(true);
    try {
      await apiCall("/auth/change-password", {
        method: "POST",
        token,
        body: { currentPassword: currentPw, newPassword: newPw },
      });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast.showToast({ message: t("password.savedToast"), kind: "success" });
    } catch (e) {
      setPwError(toErrorMessage(e, tErr));
    } finally {
      setPwBusy(false);
    }
  };

  // ── Sessions ─────────────────────────────────────────────────────────
  const signOutOthers = async (): Promise<void> => {
    if (!token) return;
    try {
      await apiCall("/auth/sessions/others", { method: "DELETE", token });
      toast.showToast({ message: t("sessions.signedOutOthersToast"), kind: "success" });
      void fetchSessions(token);
    } catch (e) {
      toast.showToast({ message: toErrorMessage(e, tErr), kind: "error" });
    }
  };

  const signOutOne = async (id: string): Promise<void> => {
    if (!token) return;
    try {
      await apiCall(`/auth/sessions/${id}`, { method: "DELETE", token });
      // If we revoked our own session, redirect out.
      if (id === thisDeviceId) {
        clearSession();
        router.replace("/login");
        return;
      }
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      toast.showToast({ message: t("sessions.revokedToast"), kind: "success" });
    } catch (e) {
      toast.showToast({ message: toErrorMessage(e, tErr), kind: "error" });
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("subtitle")}</p>
      </header>

      {/* ── Change password ─────────────────────────────────────────── */}
      <Surface as="section" variant="card" padding="0">
        <header className="px-4 py-3">
          <h2 className="text-ink text-sm font-semibold">{t("password.title")}</h2>
          <p className="text-ink-muted mt-0.5 text-xs">{t("password.desc")}</p>
        </header>
        <div className="border-line-soft border-t" />
        <form onSubmit={(e) => void onChangePassword(e)} className="flex flex-col gap-3 px-4 py-4">
          <PasswordField
            label={t("password.current")}
            value={currentPw}
            onChange={setCurrentPw}
            autoComplete="current-password"
            required
          />
          <PasswordField
            label={t("password.new")}
            value={newPw}
            onChange={setNewPw}
            autoComplete="new-password"
            helper={t("password.requirements")}
            required
          />
          <PasswordField
            label={t("password.confirm")}
            value={confirmPw}
            onChange={setConfirmPw}
            autoComplete="new-password"
            required
          />
          {pwError ? <Alert kind="danger">{pwError}</Alert> : null}
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pwBusy}
              disabled={!currentPw || !newPw || !confirmPw}
            >
              {pwBusy ? tCommon("saving") : t("password.button")}
            </Button>
          </div>
        </form>
      </Surface>

      {/* ── Active sessions ─────────────────────────────────────────── */}
      <Surface as="section" variant="card" padding="0">
        <header className="flex items-start justify-between gap-3 px-4 py-3">
          <div>
            <h2 className="text-ink text-sm font-semibold">{t("sessions.title")}</h2>
            <p className="text-ink-muted mt-0.5 text-xs">{t("sessions.desc")}</p>
          </div>
          {sessions && sessions.length > 1 ? (
            <Button variant="danger-ghost" size="sm" onClick={() => void signOutOthers()}>
              {t("sessions.signOutOthers")}
            </Button>
          ) : null}
        </header>
        <div className="border-line-soft border-t" />
        {loadingSessions ? (
          <SessionsSkeleton />
        ) : sessionsError ? (
          <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
            <p className="text-ink-muted text-sm">{sessionsError}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => token && void fetchSessions(token)}
            >
              {tCommon("retry")}
            </Button>
          </div>
        ) : sessions && sessions.length > 0 ? (
          <ul>
            {sessions.map((s, i) => (
              <li
                key={s.id}
                className={
                  "flex items-start justify-between gap-3 px-4 py-3" +
                  (i > 0 ? " border-line-soft border-t" : "")
                }
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-ink text-sm font-medium">
                      {s.device || t("sessions.unknownDevice")}
                    </span>
                    {s.id === thisDeviceId ? (
                      <span className="bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                        {t("sessions.thisDevice")}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-ink-muted mt-0.5 text-xs">
                    {[s.city, s.country].filter(Boolean).join(", ")}
                    {s.lastActiveAt
                      ? ` · ${t("sessions.lastActive", { when: formatRelative(s.lastActiveAt) })}`
                      : null}
                  </div>
                </div>
                <Button variant="danger-ghost" size="sm" onClick={() => void signOutOne(s.id)}>
                  {s.id === thisDeviceId ? t("sessions.signOutThis") : t("sessions.signOut")}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted px-4 py-6 text-center text-sm">{t("sessions.empty")}</p>
        )}
      </Surface>

      {/* ── Two-factor authentication (forward-compatible) ──────────── */}
      <Surface as="section" variant="card" padding="0">
        <header className="px-4 py-3">
          <h2 className="text-ink text-sm font-semibold">{t("twoFactor.title")}</h2>
          <p className="text-ink-muted mt-0.5 text-xs">{t("twoFactor.desc")}</p>
        </header>
        <div className="border-line-soft border-t" />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="bg-surface-subtle text-ink-muted rounded-full px-2 py-0.5 text-[11px] font-semibold">
            {t("twoFactor.comingSoon")}
          </span>
          <Button variant="secondary" size="sm" disabled>
            {t("twoFactor.enable")}
          </Button>
        </div>
      </Surface>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────────
function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  helper,
  required,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  autoComplete: string;
  helper?: string;
  required?: boolean;
}): JSX.Element {
  const [reveal, setReveal] = useState(false);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-ink text-xs font-semibold">{label}</span>
      <span className="relative inline-flex w-full">
        <Input
          type={reveal ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          dir="ltr"
          fullWidth
          className="pe-12"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="absolute inset-y-1 end-1 h-auto px-2 text-xs"
        >
          {reveal ? "Hide" : "Show"}
        </Button>
      </span>
      {helper ? <span className="text-ink-muted text-xs">{helper}</span> : null}
    </label>
  );
}

function SessionsSkeleton(): JSX.Element {
  return (
    <ul aria-hidden="true">
      {[0, 1].map((i) => (
        <li
          key={i}
          className={
            "flex items-start justify-between gap-3 px-4 py-3" +
            (i > 0 ? " border-line-soft border-t" : "")
          }
        >
          <div className="flex flex-col gap-1.5">
            <div className="bg-surface-sunken h-3.5 w-32 animate-pulse rounded" />
            <div className="bg-surface-sunken h-3 w-48 animate-pulse rounded" />
          </div>
          <div className="bg-surface-sunken h-7 w-20 animate-pulse rounded-md" />
        </li>
      ))}
    </ul>
  );
}

function formatRelative(iso: string): string {
  // Intentionally simple — i18n-aware formatting belongs in a shared util.
  // For now we render the date directly so the page is functional; future
  // work: lift `Intl.RelativeTimeFormat` wrapper from messages/page.tsx.
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
