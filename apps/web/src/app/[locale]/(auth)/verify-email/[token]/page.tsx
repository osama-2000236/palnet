"use client";

import { Alert, Button } from "@baydar/ui-web";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { AuthShell } from "../../_components/AuthShell";

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
    <AuthShell
      kicker={t("verify.kicker")}
      title={t("verify.title")}
      subtitle={
        status === "loading"
          ? t("verify.loading")
          : status === "success"
            ? t("verify.success")
            : t("verify.error")
      }
    >
      <div className="flex flex-col gap-4">
        {/* An expired link is the state most people arriving here are in. It read
            as a grey sentence with no severity; the kit already has the right
            treatment for both outcomes. */}
        {status !== "loading" ? (
          <Alert
            kind={status === "success" ? "success" : "danger"}
            body={status === "success" ? t("verify.success") : t("verify.error")}
          />
        ) : null}
        <Link href={`/${locale}/login`} className="block w-full">
          <Button variant="primary" fullWidth>
            {t("verify.backToLogin")}
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
}
