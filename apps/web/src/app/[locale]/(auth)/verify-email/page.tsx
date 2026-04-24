"use client";

import { Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";

import { apiCall } from "@/lib/api";

type Status = "idle" | "verifying" | "ok" | "error" | "missing";

export default function VerifyEmailPage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner(): JSX.Element {
  const t = useTranslations("verifyEmail");
  const params = useSearchParams();
  const token = params?.get("token") ?? "";
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (!token) {
      setStatus("missing");
      return;
    }
    setStatus("verifying");
    void (async () => {
      try {
        await apiCall("/auth/email/verify", {
          method: "POST",
          body: { token },
        });
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    })();
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <Surface as="section" variant="flat" padding="6" className="w-full">
        <h1 className="text-ink mb-2 text-xl font-bold">{t("title")}</h1>
        {status === "verifying" ? <p className="text-ink-muted text-sm">{t("verifying")}</p> : null}
        {status === "ok" ? (
          <>
            <p className="text-ink text-sm">{t("success")}</p>
            <Link
              href="/feed"
              className="bg-brand-600 text-ink-inverse mt-4 inline-block rounded-md px-4 py-2 text-sm font-semibold"
            >
              {t("goFeed")}
            </Link>
          </>
        ) : null}
        {status === "error" ? (
          <p role="alert" className="text-danger text-sm">
            {t("invalid")}
          </p>
        ) : null}
        {status === "missing" ? (
          <p className="text-ink-muted text-sm">{t("missingToken")}</p>
        ) : null}
      </Surface>
    </main>
  );
}
