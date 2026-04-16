"use client";

import { OnboardProfileBody, Profile } from "@palnet/shared";
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
        <h1 className="text-3xl font-bold text-ink">{t("title")}</h1>
        <p className="text-ink-muted">{t("subtitle")}</p>
      </header>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">{tAuth("firstName")}</span>
        <input
          className="rounded-md border border-ink-muted/30 px-3 py-2"
          value={state.firstName}
          onChange={(e) => setState({ ...state, firstName: e.target.value })}
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">{tAuth("lastName")}</span>
        <input
          className="rounded-md border border-ink-muted/30 px-3 py-2"
          value={state.lastName}
          onChange={(e) => setState({ ...state, lastName: e.target.value })}
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">{t("handle")}</span>
        <input
          dir="ltr"
          className="rounded-md border border-ink-muted/30 px-3 py-2"
          value={state.handle}
          onChange={(e) =>
            setState({ ...state, handle: e.target.value.toLowerCase() })
          }
          required
          pattern="[a-z0-9][a-z0-9-]+[a-z0-9]"
          minLength={3}
          maxLength={30}
        />
        <span className="text-xs text-ink-muted">
          {t("handleHint", { handle: state.handle || "your-handle" })}
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">{t("headline")}</span>
        <input
          className="rounded-md border border-ink-muted/30 px-3 py-2"
          value={state.headline}
          onChange={(e) => setState({ ...state, headline: e.target.value })}
          maxLength={220}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">{t("location")}</span>
        <input
          className="rounded-md border border-ink-muted/30 px-3 py-2"
          value={state.location}
          onChange={(e) => setState({ ...state, location: e.target.value })}
          maxLength={120}
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-brand-600 px-4 py-2 text-white shadow-card hover:bg-brand-700 disabled:opacity-60"
      >
        {t("submit")}
      </button>
    </form>
  );
}
