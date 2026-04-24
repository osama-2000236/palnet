"use client";

import { Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";

import { apiCall } from "@/lib/api";

type Status = "idle" | "busy" | "ok" | "error" | "missing";

export default function ResetPasswordPage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner(): JSX.Element {
  const t = useTranslations("resetPassword");
  const tAuth = useTranslations("auth");
  const params = useSearchParams();
  const token = params?.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>(token ? "idle" : "missing");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!token || !password) return;
    setStatus("busy");
    try {
      await apiCall("/auth/password/reset", {
        method: "POST",
        body: { token, newPassword: password },
      });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <Surface as="section" variant="flat" padding="6" className="w-full">
        <h1 className="text-ink mb-1 text-xl font-bold">{t("title")}</h1>

        {status === "missing" ? (
          <p className="text-ink-muted text-sm">{t("missingToken")}</p>
        ) : status === "ok" ? (
          <>
            <p className="text-ink text-sm">{t("success")}</p>
            <Link
              href="/login"
              className="bg-brand-600 text-ink-inverse mt-4 inline-block rounded-md px-4 py-2 text-sm font-semibold"
            >
              {tAuth("login")}
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
            <p className="text-ink-muted text-sm">{t("subtitle")}</p>
            <label className="flex flex-col gap-1">
              <span className="text-ink-muted text-sm">{t("newLabel")}</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
              />
            </label>
            {status === "error" ? (
              <p role="alert" className="text-danger text-sm">
                {t("invalid")}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={status === "busy" || !password}
              className="bg-brand-600 text-ink-inverse mt-1 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {t("submit")}
            </button>
          </form>
        )}
      </Surface>
    </main>
  );
}
