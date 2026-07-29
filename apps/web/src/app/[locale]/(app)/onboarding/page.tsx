"use client";

import { OnboardProfileBody, Profile } from "@baydar/shared";
import { Alert, Button, Input, OnboardingProgress, Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CityField } from "@/components/CityField";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken, writeOnboardingHandoff } from "@/lib/session";

export default function OnboardingPage(): JSX.Element {
  const t = useTranslations("onboarding");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale.startsWith("ar");
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

  // Seed from the profile the account already has. Register collects first and
  // last name, and this screen asked for them again from a blank form — so the
  // first thing a brand-new user saw was their own name missing. The native twin
  // does this on mount too (apps/mobile/src/screens/onboarding/api.ts).
  //
  // Fills only fields the user has not touched: the fetch is in flight while the
  // form is already interactive, and overwriting a keystroke is worse than
  // showing a blank.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let active = true;
    void apiFetch("/profiles/me", Profile.partial(), { token })
      .then((profile) => {
        if (!active) return;
        setState((prev) => ({
          handle: prev.handle || (profile.handle ?? ""),
          firstName: prev.firstName || (profile.firstName ?? ""),
          lastName: prev.lastName || (profile.lastName ?? ""),
          headline: prev.headline || (profile.headline ?? ""),
          location: prev.location || (profile.location ?? ""),
          country: prev.country,
        }));
      })
      .catch(() => {
        // A failed prefill is a blank form, which is what this screen was before.
      });
    return () => {
      active = false;
    };
  }, []);

  function updateField(field: keyof typeof state, value: string): void {
    setState((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

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
      writeOnboardingHandoff({
        name: [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(" "),
      });
      router.push(`/${locale}/feed?onboarded=1`);
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

  // 5-step flow per design pass: signup → verify → profile → connect → feed.
  // The user is on step 3 (profile complete) by the time this route runs;
  // steps 1+2 happen in /(auth)/* before this page is reachable.
  const stepLabels = isAr
    ? ["إنشاء الحساب", "تأكيد البريد", "إكمال الملف", "أول تواصل", "ابدأ"]
    : ["Sign up", "Verify email", "Complete profile", "First connect", "Start"];

  return (
    <main className="mx-auto w-full max-w-md px-6 py-12">
      <Surface variant="hero" padding="0" className="overflow-hidden">
        <OnboardingProgress current={3} total={5} labels={stepLabels} locale={isAr ? "ar" : "en"} />
      </Surface>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <header className="flex flex-col gap-1">
          <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>
          <p className="text-ink-muted">{t("subtitle")}</p>
        </header>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{tAuth("firstName")}</span>
          <Input
            value={state.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            required
            fullWidth
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{tAuth("lastName")}</span>
          <Input
            value={state.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            required
            fullWidth
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("handle")}</span>
          <Input
            dir="ltr"
            value={state.handle}
            onChange={(e) => updateField("handle", e.target.value.toLowerCase())}
            required
            pattern="[a-z0-9][a-z0-9-]+[a-z0-9]"
            minLength={3}
            maxLength={30}
            fullWidth
          />
          <span className="text-ink-muted text-xs">
            {t("handleHint", { handle: state.handle || "your-handle" })}
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("headline")}</span>
          <Input
            value={state.headline}
            onChange={(e) => updateField("headline", e.target.value)}
            maxLength={220}
            fullWidth
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-ink-muted text-sm">{t("location")}</span>
          <CityField value={state.location} onChange={(city) => updateField("location", city)} />
        </label>

        {error ? <Alert kind="danger" body={error} /> : null}

        <Button type="submit" loading={busy} fullWidth>
          {t("submit")}
        </Button>
      </form>
    </main>
  );
}
