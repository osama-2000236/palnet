"use client";

import { OnboardProfileBody, Profile } from "@baydar/shared";
import { Button, OnboardingProgress } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type StepKey = "identity" | "profile" | "location";

const STEP_ORDER: StepKey[] = ["identity", "profile", "location"];

interface FormState {
  firstName: string;
  lastName: string;
  handle: string;
  headline: string;
  location: string;
  country: string;
}

export default function OnboardingPage(): JSX.Element {
  const t = useTranslations("onboarding");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<FormState>({
    firstName: "",
    lastName: "",
    handle: "",
    headline: "",
    location: "",
    country: "PS",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const steps = useMemo(
    () => [
      { key: "identity", label: t("steps.identity") },
      { key: "profile", label: t("steps.profile") },
      { key: "location", label: t("steps.location") },
      { key: "connect", label: t("steps.connect") },
    ],
    [t],
  );

  const current = STEP_ORDER[stepIndex]!;
  const isLast = stepIndex === STEP_ORDER.length - 1;

  function isStepValid(step: StepKey): boolean {
    if (step === "identity") return state.firstName.trim().length > 0 && state.lastName.trim().length > 0;
    if (step === "profile")
      return /^[a-z0-9][a-z0-9-]+[a-z0-9]$/.test(state.handle) && state.headline.trim().length >= 2;
    return state.location.trim().length >= 2 && /^[A-Z]{2}$/.test(state.country.trim());
  }

  async function handleNext(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!isStepValid(current)) {
      setError(tAuth("errors.VALIDATION_FAILED"));
      return;
    }

    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }

    const parsed = OnboardProfileBody.safeParse({
      ...state,
      handle: state.handle.trim().toLowerCase(),
      country: state.country.trim().toUpperCase(),
    });
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
      router.push("/onboarding/connect");
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
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-12">
      <OnboardingProgress
        steps={steps}
        active={stepIndex}
        ariaLabel={t("progressAria")}
      />

      <header className="flex flex-col gap-1">
        <p className="text-brand-700 text-xs font-bold uppercase tracking-wide">
          {t("progress", { current: stepIndex + 1, total: steps.length })}
        </p>
        <h1 className="text-ink text-3xl font-bold">{t(`steps.${current}`)}</h1>
        <p className="text-ink-muted text-sm">{t(`stepCopy.${current}`)}</p>
      </header>

      <form onSubmit={handleNext} className="flex flex-col gap-4" noValidate>
        {current === "identity" ? (
          <>
            <Field
              label={tAuth("firstName")}
              value={state.firstName}
              onChange={(v) => setState({ ...state, firstName: v })}
              autoComplete="given-name"
              required
            />
            <Field
              label={tAuth("lastName")}
              value={state.lastName}
              onChange={(v) => setState({ ...state, lastName: v })}
              autoComplete="family-name"
              required
            />
          </>
        ) : current === "profile" ? (
          <>
            <Field
              label={t("handle")}
              hint={t("handleHint", { handle: state.handle || "your-handle" })}
              value={state.handle}
              onChange={(v) => setState({ ...state, handle: v.toLowerCase() })}
              dir="ltr"
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9][a-z0-9-]+[a-z0-9]"
              required
            />
            <Field
              label={t("headline")}
              value={state.headline}
              onChange={(v) => setState({ ...state, headline: v })}
              maxLength={220}
              required
            />
          </>
        ) : (
          <>
            <Field
              label={t("location")}
              value={state.location}
              onChange={(v) => setState({ ...state, location: v })}
              maxLength={120}
              required
            />
            <Field
              label={t("country")}
              value={state.country}
              onChange={(v) => setState({ ...state, country: v.toUpperCase() })}
              maxLength={2}
              pattern="[A-Z]{2}"
              required
            />
          </>
        )}

        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        ) : null}

        <div className="flex flex-row-reverse gap-2">
          <Button
            type="submit"
            disabled={busy}
            loading={busy}
            className="flex-1"
          >
            {t("submit")}
          </Button>
          {stepIndex > 0 ? (
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setError(null);
                setStepIndex((i) => Math.max(0, i - 1));
              }}
              className="flex-1"
            >
              {t("back")}
            </Button>
          ) : null}
        </div>
      </form>
    </main>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  dir?: "ltr" | "rtl";
}

function Field({
  label,
  hint,
  value,
  onChange,
  required,
  maxLength,
  minLength,
  pattern,
  autoComplete,
  dir,
}: FieldProps): JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-ink-muted text-sm">{label}</span>
      <input
        className="border-ink-muted/30 focus-visible:ring-brand-600 rounded-md border px-3 py-2 focus:outline-none focus-visible:ring-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        minLength={minLength}
        pattern={pattern}
        autoComplete={autoComplete}
        dir={dir}
      />
      {hint ? <span className="text-ink-muted text-xs">{hint}</span> : null}
    </label>
  );
}
