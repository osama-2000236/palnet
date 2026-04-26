"use client";

import { OnboardProfileBody, Profile } from "@baydar/shared";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function OnboardingPage(): JSX.Element {
  const t = useTranslations("onboarding");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [state, setState] = useState({
    handle: "",
    firstName: "",
    lastName: "",
    headline: "",
    location: "",
    country: "PS",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    const parsed = OnboardProfileBody.safeParse(state);
    if (!parsed.success) {
      setError(tAuth("errors.VALIDATION_FAILED"));
      return;
    }

    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/profiles/onboard", Profile.partial(), {
        method: "POST",
        body: parsed.data,
        token,
      });
      router.push("/feed");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const key = `errors.${err.code}`;
        try {
          setError(tAuth(key as Parameters<typeof tAuth>[0]));
        } catch {
          setError(tAuth("errors.INTERNAL"));
        }
      } else {
        setError(tAuth("errors.INTERNAL"));
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
      <header className="flex flex-col gap-1">
        <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>
        <p className="text-ink-muted">{t("subtitle")}</p>
      </header>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{tAuth("firstName")}</span>
        <input
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={state.firstName}
          onChange={(e) => setState({ ...state, firstName: e.target.value })}
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{tAuth("lastName")}</span>
        <input
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={state.lastName}
          onChange={(e) => setState({ ...state, lastName: e.target.value })}
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("handle")}</span>
        <input
          dir="ltr"
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={state.handle}
          onChange={(e) => setState({ ...state, handle: e.target.value.toLowerCase() })}
          required
          pattern="[a-z0-9][a-z0-9-]+[a-z0-9]"
          minLength={3}
          maxLength={30}
        />
        <span className="text-ink-muted text-xs">
          {t("handleHint", { handle: state.handle || "your-handle" })}
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("headline")}</span>
        <input
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={state.headline}
          onChange={(e) => setState({ ...state, headline: e.target.value })}
          maxLength={220}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("location")}</span>
        <input
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={state.location}
          onChange={(e) => setState({ ...state, location: e.target.value })}
          maxLength={120}
        />
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
        {t("submit")}
      </button>
    </form>
  );
}
