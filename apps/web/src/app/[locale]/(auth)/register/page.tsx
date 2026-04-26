"use client";

import { RegisterBody } from "@baydar/shared";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ApiRequestError, registerAction } from "@/lib/auth-actions";

export default function RegisterPage(): JSX.Element {
  const t = useTranslations("auth");
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
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-4 px-6 py-12"
      noValidate
    >
      <h1 className="text-ink text-3xl font-bold">{t("register")}</h1>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("firstName")}</span>
        <input
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={state.firstName}
          onChange={(e) => setState({ ...state, firstName: e.target.value })}
          required
          autoComplete="given-name"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("lastName")}</span>
        <input
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={state.lastName}
          onChange={(e) => setState({ ...state, lastName: e.target.value })}
          required
          autoComplete="family-name"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("email")}</span>
        <input
          type="email"
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={state.email}
          onChange={(e) => setState({ ...state, email: e.target.value })}
          required
          autoComplete="email"
          inputMode="email"
          dir="ltr"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("password")}</span>
        <input
          type="password"
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={state.password}
          onChange={(e) => setState({ ...state, password: e.target.value })}
          required
          autoComplete="new-password"
          minLength={8}
          dir="ltr"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.acceptTerms}
          onChange={(e) => setState({ ...state, acceptTerms: e.target.checked })}
          required
        />
        {t("acceptTerms")}
      </label>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="bg-brand-600 text-ink-inverse shadow-card hover:bg-brand-700 rounded-md px-4 py-2 disabled:opacity-60"
      >
        {t("submitRegister")}
      </button>
    </form>
  );
}
