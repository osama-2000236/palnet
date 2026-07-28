"use client";

import { Button, Input, useToast } from "@baydar/ui-web";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { AuthShell } from "../../_components/AuthShell";

import { ApiRequestError, resetPasswordAction } from "@/lib/auth-actions";

export default function ResetPasswordPage(): JSX.Element {
  const t = useTranslations("auth");
  const { showToast } = useToast();
  const locale = useLocale();
  const params = useParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetComplete, setResetComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast({ message: t("reset.passwordMismatch"), kind: "error" });
      return;
    }
    setBusy(true);
    try {
      await resetPasswordAction(params.token, newPassword);
      setResetComplete(true);
      showToast({ message: t("reset.success"), kind: "success" });
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
    <AuthShell kicker={t("reset.kicker")} title={t("reset.title")} subtitle={t("reset.body")}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("reset.newPassword")}</span>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
            dir="ltr"
            fullWidth
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("reset.confirmPassword")}</span>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            dir="ltr"
            fullWidth
          />
        </label>

        <Button type="submit" variant="primary" loading={busy} disabled={resetComplete} fullWidth>
          {t("reset.submit")}
        </Button>

        <Link href={`/${locale}/login`} className="text-brand-700 text-sm font-semibold">
          {t("reset.backToLogin")}
        </Link>
      </form>
    </AuthShell>
  );
}
