"use client";

import {
  ChangeEmailBody,
  ChangePasswordBody,
  DeleteAccountBody,
  type AuthSession,
} from "@palnet/shared";
import { Surface } from "@palnet/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { apiCall } from "@/lib/api";
import { clearSession, getAccessToken, readSession } from "@/lib/session";

export default function AccountSettingsPage(): JSX.Element {
  const t = useTranslations("settings.account");
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const s = readSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    setSession(s);
  }, [router]);

  if (!session) {
    return <p className="text-ink-muted">…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-ink text-2xl font-bold md:hidden">{t("title")}</h2>
      <ChangeEmailCard email={session.user.email} />
      <ChangePasswordCard />
      <DeleteAccountCard />
    </div>
  );
}

// ───────── Change email ─────────

function ChangeEmailCard({ email }: { email: string }): JSX.Element {
  const t = useTranslations("settings.account");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  async function submit(): Promise<void> {
    setStatus("idle");
    const parsed = ChangeEmailBody.safeParse({
      newEmail,
      currentPassword: password,
    });
    if (!parsed.success) {
      setStatus("error");
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiCall("/account/email", {
        method: "POST",
        body: parsed.data,
        token,
      });
      setStatus("ok");
      setPassword("");
      setNewEmail("");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface as="section" variant="flat" padding="6">
      <h2 className="text-ink mb-1 text-lg font-semibold">{t("email.title")}</h2>
      <p className="text-ink-muted mb-4 text-sm">
        {t("email.current")}: <span dir="ltr">{email}</span>
      </p>
      <Field label={t("email.newLabel")}>
        <input
          type="email"
          autoComplete="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
          dir="ltr"
        />
      </Field>
      <Field label={t("passwordLabel")}>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
        />
      </Field>
      <StatusLine status={status} t={t} />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !newEmail || !password}
          className="bg-brand-600 text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {t("email.submit")}
        </button>
      </div>
    </Surface>
  );
}

// ───────── Change password ─────────

function ChangePasswordCard(): JSX.Element {
  const t = useTranslations("settings.account");
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  async function submit(): Promise<void> {
    setStatus("idle");
    const parsed = ChangePasswordBody.safeParse({
      currentPassword: current,
      newPassword: next,
    });
    if (!parsed.success) {
      setStatus("error");
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiCall("/account/password", {
        method: "POST",
        body: parsed.data,
        token,
      });
      // API revokes all refresh tokens — log the user out locally to match.
      clearSession();
      router.replace("/login?pwChanged=1");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface as="section" variant="flat" padding="6">
      <h2 className="text-ink mb-1 text-lg font-semibold">{t("password.title")}</h2>
      <p className="text-ink-muted mb-4 text-sm">{t("password.hint")}</p>
      <Field label={t("password.currentLabel")}>
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
        />
      </Field>
      <Field label={t("password.newLabel")}>
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
        />
      </Field>
      <StatusLine status={status} t={t} />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !current || !next}
          className="bg-brand-600 text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {t("password.submit")}
        </button>
      </div>
    </Surface>
  );
}

// ───────── Delete account ─────────

function DeleteAccountCard(): JSX.Element {
  const t = useTranslations("settings.account");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "error">("idle");

  async function submit(): Promise<void> {
    setStatus("idle");
    const parsed = DeleteAccountBody.safeParse({
      currentPassword: password,
      confirmation: confirm,
    });
    if (!parsed.success) {
      setStatus("error");
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      await apiCall("/account", {
        method: "DELETE",
        body: parsed.data,
        token,
      });
      clearSession();
      router.replace("/");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface as="section" variant="flat" padding="6">
      <h2 className="text-danger mb-1 text-lg font-semibold">{t("delete.title")}</h2>
      <p className="text-ink-muted mb-4 text-sm">{t("delete.hint")}</p>
      <Field label={t("passwordLabel")}>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
        />
      </Field>
      <Field label={t("delete.confirmLabel")}>
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          dir="ltr"
          placeholder="DELETE"
          className="border-ink-muted/30 w-full rounded-md border px-3 py-2 font-mono"
        />
      </Field>
      {status === "error" ? (
        <p className="text-danger mt-2 text-sm" role="alert">
          {t("genericError")}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={busy || confirm !== "DELETE" || !password}
          className="border-danger bg-danger/10 text-danger hover:bg-danger/20 rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {t("delete.submit")}
        </button>
      </div>
    </Surface>
  );
}

// ───────── helpers ─────────

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="mt-2 flex flex-col gap-1">
      <span className="text-ink-muted text-sm">{label}</span>
      {children}
    </label>
  );
}

function StatusLine({
  status,
  t,
}: {
  status: "idle" | "ok" | "error";
  t: ReturnType<typeof useTranslations>;
}): JSX.Element | null {
  if (status === "idle") return null;
  if (status === "ok") {
    return (
      <p role="status" className="text-success mt-2 text-sm">
        {t("savedOk")}
      </p>
    );
  }
  return (
    <p role="alert" className="text-danger mt-2 text-sm">
      {t("genericError")}
    </p>
  );
}
