"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { ApiRequestError, loginAction } from "@/lib/auth-actions";

export function LoginForm(): JSX.Element {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await loginAction({ email, password });
      router.push("/feed");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const key = `errors.${err.code}`;
        try {
          setError(t(key as Parameters<typeof t>[0]));
        } catch {
          setError(t("errors.INTERNAL"));
        }
      } else {
        setError(t("errors.INTERNAL"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <h1 className="text-ink text-3xl font-bold">{t("login")}</h1>
      {params.get("deleted") === "grace" ? (
        <p className="border-brand-600/30 bg-brand-50 text-brand-900 rounded-md border px-3 py-2 text-sm">
          {t("deletedGraceBanner")}
        </p>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("email")}</span>
        <input
          type="email"
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          dir="ltr"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("password")}</span>
        <input
          type="password"
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          dir="ltr"
        />
      </label>

      <Link
        href={`/${locale}/auth/forgot-password`}
        className="text-brand-700 hover:text-brand-800 text-sm font-semibold"
      >
        {t("forgot.link")}
      </Link>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="bg-brand-600 text-ink-inverse shadow-card hover:bg-brand-700 rounded-md px-4 py-2 disabled:opacity-60"
      >
        {t("submitLogin")}
      </button>
    </form>
  );
}
