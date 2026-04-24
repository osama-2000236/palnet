"use client";

import { Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { apiCall } from "@/lib/api";

export default function ForgotPasswordPage(): JSX.Element {
  const t = useTranslations("forgotPassword");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await apiCall("/auth/password/reset/request", {
        method: "POST",
        body: { email },
      });
    } catch {
      // We never reveal whether the email existed; mirror that in the UI too.
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <Surface as="section" variant="flat" padding="6" className="w-full">
        <h1 className="mb-1 text-xl font-bold text-ink">{t("title")}</h1>
        <p className="mb-4 text-sm text-ink-muted">{t("subtitle")}</p>

        {sent ? (
          <>
            <p className="text-sm text-ink">{t("sent")}</p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">{t("emailLabel")}</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
                dir="ltr"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !email}
              className="mt-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-ink-inverse disabled:opacity-60"
            >
              {t("submit")}
            </button>
            <Link
              href="/login"
              className="text-center text-sm font-semibold text-brand-700 hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </form>
        )}
      </Surface>
    </main>
  );
}
