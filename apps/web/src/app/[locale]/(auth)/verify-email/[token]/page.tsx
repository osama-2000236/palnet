"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { confirmVerifyEmailAction } from "@/lib/auth-actions";

export default function VerifyEmailPage(): JSX.Element {
  const t = useTranslations("auth");
  const locale = useLocale();
  const params = useParams<{ token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let active = true;
    confirmVerifyEmailAction(params.token)
      .then(() => {
        if (active) setStatus("success");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [params.token]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-6 py-12">
      <h1 className="text-ink text-3xl font-bold">{t("verify.title")}</h1>
      <p className="text-ink-muted text-sm">
        {status === "loading"
          ? t("verify.loading")
          : status === "success"
            ? t("verify.success")
            : t("verify.error")}
      </p>
      <Link href={`/${locale}/login`} className="text-brand-700 text-sm font-semibold">
        {t("verify.backToLogin")}
      </Link>
    </main>
  );
}
