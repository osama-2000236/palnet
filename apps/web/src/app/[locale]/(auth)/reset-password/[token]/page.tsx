"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { ApiRequestError, resetPasswordAction } from "@/lib/auth-actions";

export default function ResetPasswordPage(): JSX.Element {
  const t = useTranslations("auth");
  const locale = useLocale();
  const params = useParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "reset">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t("reset.passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      await resetPasswordAction(params.token, newPassword);
      setStatus("reset");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(t(`errors.${err.code}` as Parameters<typeof t>[0]));
      } else {
        setError(t("errors.INTERNAL"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <h1 className="text-ink text-3xl font-bold">{t("reset.title")}</h1>
        <p className="text-ink-muted text-sm">{t("reset.body")}</p>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("reset.newPassword")}</span>
          <input
            type="password"
            className="border-ink-muted/30 rounded-md border px-3 py-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            dir="ltr"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("reset.confirmPassword")}</span>
          <input
            type="password"
            className="border-ink-muted/30 rounded-md border px-3 py-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            dir="ltr"
          />
        </label>

        {status === "reset" ? (
          <p role="status" className="text-success text-sm">
            {t("reset.success")}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || status === "reset"}
          className="bg-brand-600 text-ink-inverse shadow-card hover:bg-brand-700 rounded-md px-4 py-2 disabled:opacity-60"
        >
          {t("reset.submit")}
        </button>

        <Link href={`/${locale}/auth/login`} className="text-brand-700 text-sm font-semibold">
          {t("reset.backToLogin")}
        </Link>
      </form>
    </main>
  );
}
