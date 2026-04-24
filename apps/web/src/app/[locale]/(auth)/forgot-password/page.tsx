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
        <h1 className="text-ink mb-1 text-xl font-bold">{t("title")}</h1>
        <p className="text-ink-muted mb-4 text-sm">{t("subtitle")}</p>

        {sent ? (
          <>
            <p className="text-ink text-sm">{t("sent")}</p>
            <Link
              href="/login"
              className="text-brand-700 mt-4 inline-block text-sm font-semibold hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
            <label className="flex flex-col gap-1">
              <span className="text-ink-muted text-sm">{t("emailLabel")}</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
                dir="ltr"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !email}
              className="bg-brand-600 text-ink-inverse mt-1 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {t("submit")}
            </button>
            <Link
              href="/login"
              className="text-brand-700 text-center text-sm font-semibold hover:underline"
            >
              {t("backToLogin")}
            </Link>
          </form>
        )}
      </Surface>
    </main>
  );
}
