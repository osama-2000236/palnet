"use client";

import { Button, Input, useToast } from "@baydar/ui-web";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { AuthShell } from "../_components/AuthShell";

import { ApiRequestError, forgotPasswordAction } from "@/lib/auth-actions";

export default function ForgotPasswordPage(): JSX.Element {
  const t = useTranslations("auth");
  const { showToast } = useToast();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    try {
      await forgotPasswordAction(email);
      showToast({ message: t("forgot.sent"), kind: "success" });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        showToast({
          message: t(`errors.${err.code}` as Parameters<typeof t>[0]),
          kind: "error",
        });
      } else {
        showToast({ message: t("errors.INTERNAL"), kind: "error" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell kicker={t("forgot.kicker")} title={t("forgot.title")} subtitle={t("forgot.body")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("email")}</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            dir="ltr"
            fullWidth
          />
        </label>

        <Button type="submit" variant="primary" loading={busy} fullWidth>
          {t("forgot.submit")}
        </Button>

        <Link href={`/${locale}/login`} className="text-brand-700 text-sm font-semibold">
          {t("forgot.backToLogin")}
        </Link>
      </form>
    </AuthShell>
  );
}
