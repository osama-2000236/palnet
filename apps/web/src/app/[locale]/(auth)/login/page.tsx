"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ApiRequestError, loginAction } from "@/lib/auth-actions";

export default function LoginPage(): JSX.Element {
  const t = useTranslations("auth");
  const tForgot = useTranslations("forgotPassword");
  const router = useRouter();
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
    <main className="px-6 py-12">
      <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-md flex-col gap-4" noValidate>
        <h1 className="text-ink text-3xl font-bold">{t("login")}</h1>

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

        <Link
          href="/forgot-password"
          className="text-brand-700 text-center text-sm font-semibold hover:underline"
        >
          {tForgot("title")}
        </Link>
      </form>
    </main>
  );
}
