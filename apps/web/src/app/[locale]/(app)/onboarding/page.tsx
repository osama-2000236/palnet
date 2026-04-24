"use client";

import { OnboardProfileBody, Profile } from "@palnet/shared";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const BootstrapProfile = z.object({
  handle: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  headline: z.string().nullish(),
  location: z.string().nullish(),
  country: z.string().nullish(),
});

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
  const [ready, setReady] = useState(false);
  const [hasProfileName, setHasProfileName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    void apiFetch("/profiles/me", BootstrapProfile, { token })
      .then((profile) => {
        if (cancelled) return;

        const firstName = profile.firstName?.trim() ?? "";
        const lastName = profile.lastName?.trim() ?? "";
        const handle = resolveHandle({
          handle: profile.handle ?? "",
          firstName,
          lastName,
        });

        setState({
          handle,
          firstName,
          lastName,
          headline: profile.headline ?? "",
          location: profile.location ?? "",
          country: profile.country ?? "PS",
        });
        setHasProfileName(Boolean(firstName && lastName));
      })
      .catch(() => {
        if (cancelled) return;
        setHasProfileName(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    const nextState = {
      ...state,
      handle: resolveHandle(state),
    };
    setState(nextState);

    const parsed = OnboardProfileBody.safeParse(nextState);
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

      {!ready ? (
        <div className="bg-sand-100/70 h-28 animate-pulse rounded-2xl" />
      ) : !hasProfileName ? (
        <>
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
        </>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-ink-muted text-sm">{t("handle")}</span>
        <input
          dir="ltr"
          className="border-ink-muted/30 rounded-md border px-3 py-2"
          value={state.handle}
          onChange={(e) =>
            setState({
              ...state,
              handle: normalizeHandleInput(e.target.value),
            })
          }
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
        disabled={busy || !ready}
        className="bg-brand-600 text-ink-inverse shadow-card hover:bg-brand-700 rounded-md px-4 py-2 disabled:opacity-60"
      >
        {t("submit")}
      </button>
    </form>
  );
}

function resolveHandle(input: { handle: string; firstName: string; lastName: string }): string {
  const existing = normalizeHandleInput(input.handle);
  if (isValidHandle(existing)) return existing;

  const fromName = normalizeHandleInput(`${input.firstName}-${input.lastName}`);
  if (isValidHandle(fromName)) return fromName;

  return `member-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeHandleInput(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

function isValidHandle(value: string): boolean {
  return value.length >= 3 && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value);
}
