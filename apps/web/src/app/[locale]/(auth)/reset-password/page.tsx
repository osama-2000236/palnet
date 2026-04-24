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
        <h1 className="mb-1 text-xl font-bold text-ink">{t("title")}</h1>

        {status === "missing" ? (
          <p className="text-sm text-ink-muted">{t("missingToken")}</p>
        ) : status === "ok" ? (
          <>
            <p className="text-sm text-ink">{t("success")}</p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-ink-inverse"
            >
              {tAuth("login")}
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
            <p className="text-sm text-ink-muted">{t("subtitle")}</p>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">{t("newLabel")}</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
              />
            </label>
            {status === "error" ? (
              <p role="alert" className="text-sm text-danger">
                {t("invalid")}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={status === "busy" || !password}
              className="mt-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-ink-inverse disabled:opacity-60"
            >
              {t("submit")}
            </button>
          </form>
        )}
      </Surface>
    </main>
  );
}
