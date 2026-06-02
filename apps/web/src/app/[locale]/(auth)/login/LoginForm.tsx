"use client";

// LoginForm — REFACTORED to consume the new ui-web atoms (Sweep PR).
//
// Changes from `main`:
//   • Raw <input> fields replaced with <Input> — gains: standard focus ring,
//     hover state, error styling baked in (we now pass error={true} when
//     the form-level error is set).
//   • The `deletedGraceBanner` (brand-tinted block) is now <Alert kind="info">
//     — same purpose, consistent treatment with every other in-flow message.
//   • The error <p role="alert"> is now <Alert kind="danger"> — gains: icon,
//     screen-reader semantics, severity colour.
//
// Functionality unchanged. Translation keys are identical.

import { Alert, Button, Input } from "@baydar/ui-web";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { ApiRequestError, loginAction } from "@/lib/auth-actions";

export function LoginForm(): JSX.Element {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <h1 className="text-ink text-3xl font-bold">{t("login")}</h1>

      {params.get("deleted") === "grace" ? (
        <Alert kind="info">{t("deletedGraceBanner")}</Alert>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("email")}</span>
        <Input
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          error={Boolean(error)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("password")}</span>
        <Input
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          dir="ltr"
          error={Boolean(error)}
        />
      </label>

      <Link
        href={`/${locale}/auth/forgot-password`}
        className="text-brand-700 hover:text-brand-800 text-sm font-semibold"
      >
        {t("forgot.link")}
      </Link>

      {error ? <Alert kind="danger">{error}</Alert> : null}

      <Button type="submit" variant="primary" loading={busy} fullWidth>
        {t("submitLogin")}
      </Button>
    </form>
  );
}
