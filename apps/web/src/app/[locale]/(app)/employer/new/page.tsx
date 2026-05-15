"use client";

import { Company, CreateCompanyBody } from "@baydar/shared";
import { Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

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
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label={t("slug")} hint={t("slugHelp")} required>
            <input
              required
              value={form.slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))
              }
              pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
              className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label={t("tagline")}>
            <input
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label={t("website")}>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label={t("industry")}>
            <input
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("city")}>
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label={t("country")}>
              <input
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))}
                maxLength={2}
                className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
              />
            </Field>
          </div>

          {error ? <p className="text-status-danger text-sm">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-500 hover:bg-brand-600 inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? t("submitting") : t("submit")}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="text-ink-muted text-sm"
            >
              {tCommon("cancel")}
            </button>
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
