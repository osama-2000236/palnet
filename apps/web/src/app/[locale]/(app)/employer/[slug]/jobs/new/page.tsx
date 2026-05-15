"use client";

import {
  Company,
  EmployerJob,
  JobLocationMode,
  JobType,
} from "@baydar/shared";
import { Surface } from "@baydar/ui-web";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";

type FormState = {
  title: string;
  description: string;
  type: JobType;
  locationMode: JobLocationMode;
  city: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  expiresAt: string;
};

const EMPTY: FormState = {
  title: "",
  description: "",
  type: "FULL_TIME",
  locationMode: "ONSITE",
  city: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "ILS",
  expiresAt: "",
};

export default function NewJobPage(): JSX.Element {
  const t = useTranslations("employer.newJob");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [token, setToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const s = readSession();
    if (!s) {
      router.replace(`/${locale}/login`);
      return;
    }
    setToken(s.tokens.accessToken);
  }, [router, locale]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const c = await apiFetch(`/companies/${encodeURIComponent(slug)}`, Company, {
          token,
        });
        setCompanyId(c.id);
      } catch (e) {
        setError(toErrorMessage(e, tErr));
      }
    })();
  }, [token, slug, tErr]);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!token || !companyId) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        type: form.type,
        locationMode: form.locationMode,
        ...(form.city ? { city: form.city } : {}),
        country: "PS",
        ...(form.salaryMin ? { salaryMin: Number(form.salaryMin) } : {}),
        ...(form.salaryMax ? { salaryMax: Number(form.salaryMax) } : {}),
        salaryCurrency: form.salaryCurrency || "ILS",
        skillsRequired: [],
        ...(form.expiresAt
          ? { expiresAt: new Date(form.expiresAt).toISOString() }
          : {}),
      };
      await apiFetch(
        `/companies/${companyId}/jobs`,
        EmployerJob,
        { method: "POST", body, token },
      );
      router.replace(`/${locale}/employer/${slug}`);
    } catch (err) {
      setError(toErrorMessage(err, tErr));
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-6">
      <h1 className="text-ink mb-4 text-2xl font-semibold">{t("title")}</h1>
      <Surface variant="card" padding="4">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
          <Field label={t("fieldTitle")} required>
            <input
              required
              minLength={3}
              maxLength={160}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </Field>
          <Field label={t("description")} required>
            <textarea
              required
              minLength={30}
              rows={6}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("type")}>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as JobType }))
                }
                className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
              >
                {Object.values(JobType).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("locationMode")}>
              <select
                value={form.locationMode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    locationMode: e.target.value as JobLocationMode,
                  }))
                }
                className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
              >
                {Object.values(JobLocationMode).map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={t("city")}>
            <input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("salaryMin")}>
              <input
                type="number"
                min={0}
                value={form.salaryMin}
                onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
                className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label={t("salaryMax")}>
              <input
                type="number"
                min={0}
                value={form.salaryMax}
                onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
                className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
              />
            </Field>
            <Field label={t("salaryCurrency")}>
              <input
                value={form.salaryCurrency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, salaryCurrency: e.target.value.toUpperCase() }))
                }
                maxLength={3}
                className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
              />
            </Field>
          </div>
          <Field label={t("expiresAt")}>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="border-line-hard bg-surface text-ink w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </Field>

          {error ? <p className="text-status-danger text-sm">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !companyId}
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
  required,
  children,
}: {
  label: string;
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
    </label>
  );
}
