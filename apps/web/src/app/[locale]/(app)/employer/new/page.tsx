"use client";

// Create a company page. Fields mirror `CreateCompanyBody`; the native twin is
// apps/mobile/app/(app)/employer/new.tsx.
//
// The controls used to be raw <input>/<button> with hand-written border and
// background classes, which is why this screen rendered as an unstyled stack of
// boxes next to the rest of the app. They are kit atoms now — same focus ring,
// same hover, same disabled treatment as every other form.
import { Company, CreateCompanyBody, PS_INDUSTRIES } from "@baydar/shared";
import { Alert, Button, Input, Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { CityField } from "@/components/CityField";
import { apiFetch } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";

type FormState = {
  slug: string;
  name: string;
  tagline: string;
  website: string;
  industry: string;
  city: string;
  country: string;
};

const EMPTY: FormState = {
  slug: "",
  name: "",
  tagline: "",
  website: "",
  industry: "",
  city: "",
  country: "PS",
};

export default function NewCompanyPage(): JSX.Element {
  const t = useTranslations("employer.form");
  const tErr = useTranslations("errors");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();

  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const s = readSession();
    if (!s) router.replace(`/${locale}/login`);
    else setToken(s.tokens.accessToken);
  }, [router, locale]);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = CreateCompanyBody.parse({
        slug: form.slug,
        name: form.name,
        tagline: form.tagline || undefined,
        website: form.website || undefined,
        industry: form.industry || undefined,
        city: form.city || undefined,
        country: form.country || "PS",
      });
      const created = await apiFetch("/companies", Company, {
        method: "POST",
        body,
        token,
      });
      router.replace(`/${locale}/employer/${created.slug}`);
    } catch (err) {
      setError(toErrorMessage(err, tErr));
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-6">
      <Surface variant="card" padding="4">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
          <Field label={t("name")} required>
            <Input
              fullWidth
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label={t("slug")} hint={t("slugHelp")} required>
            <Input
              fullWidth
              required
              dir="ltr"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))}
              pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
            />
          </Field>
          <Field label={t("tagline")}>
            <Input
              fullWidth
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            />
          </Field>
          <Field label={t("website")}>
            <Input
              fullWidth
              type="url"
              dir="ltr"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
          </Field>
          <Field label={t("industry")}>
            {/* Canonical PS_INDUSTRIES suggestions so the jobs sector facet
                matches; free text stays allowed. */}
            <Input
              fullWidth
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              list="ps-industries"
            />
            <datalist id="ps-industries">
              {PS_INDUSTRIES.map((industry) => (
                <option key={industry.key} value={industry.ar}>
                  {industry.en}
                </option>
              ))}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("city")}>
              {/* The curated PS picker every other city field on both platforms
                  uses — this one was a free-text box, so a company could store a
                  spelling the jobs city facet never matches. */}
              <CityField value={form.city} onChange={(city) => setForm((f) => ({ ...f, city }))} />
            </Field>
            <Field label={t("country")}>
              <Input
                fullWidth
                dir="ltr"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))}
                maxLength={2}
              />
            </Field>
          </div>

          {error ? <Alert kind="danger">{error}</Alert> : null}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" variant="primary" loading={submitting}>
              {submitting ? t("submitting") : t("submit")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      </Surface>
    </main>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-ink mb-1 block text-xs font-medium">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {hint ? <span className="text-ink-muted mt-1 block text-xs">{hint}</span> : null}
    </label>
  );
}
