"use client";

// Register — REFACTORED to consume the new ui-web atoms (Sweep PR).
//
// Changes from `main`:
//   • 4 raw <input> fields replaced with <Input>.
//   • Error <p role="alert"> replaced with <Alert kind="danger">.
//   • Submit button uses the standard <Button loading> spinner instead of
//     disabled-opacity-60.
//
import { RegisterBody } from "@baydar/shared";
import { Alert, Button, Checkbox, Input } from "@baydar/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { AuthShell, AuthSwitch } from "../_components/AuthShell";

import { ApiRequestError, registerAction } from "@/lib/auth-actions";

export default function RegisterPage(): JSX.Element {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [state, setState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    acceptTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    const parsed = RegisterBody.safeParse({
      firstName: state.firstName,
      lastName: state.lastName,
      email: state.email,
      password: state.password,
      acceptTerms: state.acceptTerms || undefined,
    });
    if (!parsed.success) {
      setError(t("errors.VALIDATION_FAILED"));
      return;
    }

    setBusy(true);
    try {
      await registerAction(parsed.data);
      router.push("/onboarding");
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
    <AuthShell
      kicker={t("registerKicker")}
      title={t("createProfile")}
      subtitle={t("registerSubtitle")}
      footer={
        <AuthSwitch prompt={t("haveAccount")} href={`/${locale}/login`} action={t("login")} />
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("firstName")}</span>
          <Input
            fullWidth
            value={state.firstName}
            onChange={(e) => setState({ ...state, firstName: e.target.value })}
            required
            autoComplete="given-name"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("lastName")}</span>
          <Input
            fullWidth
            value={state.lastName}
            onChange={(e) => setState({ ...state, lastName: e.target.value })}
            required
            autoComplete="family-name"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("email")}</span>
          <Input
            type="email"
            fullWidth
            value={state.email}
            onChange={(e) => setState({ ...state, email: e.target.value })}
            required
            autoComplete="email"
            inputMode="email"
            dir="ltr"
            error={error === t("errors.VALIDATION_FAILED")}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("password")}</span>
          <Input
            type="password"
            fullWidth
            value={state.password}
            onChange={(e) => setState({ ...state, password: e.target.value })}
            required
            autoComplete="new-password"
            minLength={10}
            dir="ltr"
            helper={t("passwordHint")}
          />
        </label>

        {/* The label used to be plain text: the user had to accept two documents
            they had no way to open. Both pages already existed at /legal/*. */}
        <Checkbox
          checked={state.acceptTerms}
          onChange={(checked) => setState({ ...state, acceptTerms: checked })}
          required
          label={
            <span>
              {t("acceptTermsPrefix")}{" "}
              <Link
                href={`/${locale}/legal/tos`}
                className="text-brand-700 font-semibold underline"
              >
                {t("termsLink")}
              </Link>{" "}
              {t("acceptTermsSeparator")}{" "}
              <Link
                href={`/${locale}/legal/privacy`}
                className="text-brand-700 font-semibold underline"
              >
                {t("privacyLink")}
              </Link>
            </span>
          }
        />

        {error ? <Alert kind="danger" body={error} /> : null}

        <Button type="submit" variant="primary" loading={busy} fullWidth>
          {t("submitRegister")}
        </Button>
      </form>
    </AuthShell>
  );
}
