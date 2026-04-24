"use client";

import {
  type Application as JobApplication,
  Application as ApplicationSchema,
  Company as CompanySchema,
  type CreateCompanyBody as CreateCompanyInput,
  CreateCompanyBody,
  type ManagedCompany,
  ManagedCompany as ManagedCompanySchema,
  cursorPage,
} from "@palnet/shared";
import { Button, Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { apiFetch, apiFetchPage } from "@/lib/api";
import { readSession } from "@/lib/session";

const ApplicationsPage = cursorPage(ApplicationSchema);
const ManagedCompaniesSchema = z.array(ManagedCompanySchema);

type CompanyFormState = {
  slug: string;
  name: string;
  tagline: string;
  website: string;
  industry: string;
  city: string;
  sizeBucket: string;
  about: string;
};

const EMPTY_COMPANY_FORM: CompanyFormState = {
  slug: "",
  name: "",
  tagline: "",
  website: "",
  industry: "",
  city: "",
  sizeBucket: "",
  about: "",
};

export default function MyJobsPage(): JSX.Element {
  const tJobs = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [companies, setCompanies] = useState<ManagedCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(EMPTY_COMPANY_FORM);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  const loadCompanies = useCallback(
    async (tk: string): Promise<void> => {
      setCompaniesLoading(true);
      try {
        const data = await apiFetch("/companies/mine", ManagedCompaniesSchema, {
          token: tk,
        });
        setCompanies(data);
      } catch (err) {
        setError((err as Error).message || tCommon("genericError"));
      } finally {
        setCompaniesLoading(false);
      }
    },
    [tCommon],
  );

  const loadApplications = useCallback(
    async (tk: string, after: string | null): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ limit: "20" });
        if (after) qs.set("after", after);
        const page = await apiFetchPage(`/me/applications?${qs.toString()}`, ApplicationsPage, {
          token: tk,
        });
        setApplications((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } catch (err) {
        setError((err as Error).message || tCommon("genericError"));
      } finally {
        setLoading(false);
        setFirstLoad(false);
      }
    },
    [tCommon],
  );

  useEffect(() => {
    if (!token) return;
    void loadCompanies(token);
    void loadApplications(token, null);
  }, [token, loadCompanies, loadApplications]);

  const appliedFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [locale],
  );

  async function createCompany(): Promise<void> {
    if (!token || creatingCompany) return;
    setCreateError(null);
    const parsed = CreateCompanyBody.safeParse(toCompanyPayload(companyForm));
    if (!parsed.success) {
      setCreateError(tJobs("companyCreateInvalid"));
      return;
    }

    setCreatingCompany(true);
    try {
      const company = await apiFetch("/companies", CompanySchema, {
        method: "POST",
        token,
        body: parsed.data,
      });
      setCompanyForm(EMPTY_COMPANY_FORM);
      await loadCompanies(token);
      router.push(`/companies/${company.slug}/admin`);
    } catch (err) {
      setCreateError((err as Error).message || tCommon("genericError"));
    } finally {
      setCreatingCompany(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1128px] flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-ink text-2xl font-semibold">{tJobs("myApplications")}</h1>
          <p className="text-ink-muted text-sm">{tJobs("myApplicationsHint")}</p>
        </div>
        <Link href="/jobs" className="text-brand-700 hover:text-brand-800 text-sm font-medium">
          {tJobs("browseJobs")}
        </Link>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-4">
          {firstLoad ? (
            <ApplicationsSkeleton />
          ) : error ? (
            <Surface variant="tinted" padding="6">
              <p className="text-ink-muted text-sm">{error}</p>
            </Surface>
          ) : applications.length === 0 ? (
            <Surface variant="tinted" padding="8">
              <p className="text-ink text-sm font-semibold">{tJobs("emptyApplicationsTitle")}</p>
              <p className="text-ink-muted mt-1 text-sm">{tJobs("emptyApplicationsBody")}</p>
            </Surface>
          ) : (
            <>
              <ul className="space-y-3">
                {applications.map((application) => (
                  <li key={application.id}>
                    <Surface variant="card" padding="4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <Link
                            href={`/jobs/${application.job.id}`}
                            className="text-ink hover:text-brand-700 block text-base font-semibold"
                          >
                            {application.job.title}
                          </Link>
                          <Link
                            href={`/companies/${application.company.slug}`}
                            className="text-ink-muted hover:text-ink mt-1 block text-sm"
                          >
                            {application.company.name}
                          </Link>
                          <p className="text-ink-muted mt-2 text-xs">
                            {tJobs("appliedOn", {
                              date: appliedFormatter.format(new Date(application.createdAt)),
                            })}
                          </p>
                          {application.coverLetter ? (
                            <p className="text-ink-muted mt-2 line-clamp-3 text-sm">
                              {application.coverLetter}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-2">
                          <StatusBadge
                            label={tJobs(`applicationStatusLabels.${application.status}`)}
                            status={application.status}
                          />
                          {application.resumeUrl ? (
                            <a
                              href={application.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-700 hover:text-brand-800 text-xs font-medium"
                            >
                              {tJobs("resumeLink")}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </Surface>
                  </li>
                ))}
              </ul>

              {hasMore && token ? (
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => void loadApplications(token, cursor)}
                    loading={loading}
                  >
                    {tJobs("loadMoreApplications")}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <Surface variant="card" padding="4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-ink text-base font-semibold">{tJobs("managedCompanies")}</h2>
                <p className="text-ink-muted mt-1 text-sm">{tJobs("managedCompaniesHint")}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {companiesLoading ? (
                <p className="text-ink-muted text-sm">{tCommon("loading")}</p>
              ) : companies.length === 0 ? (
                <p className="text-ink-muted text-sm">{tJobs("emptyCompanies")}</p>
              ) : (
                companies.map((company) => (
                  <div
                    key={company.id}
                    className="border-line-soft bg-surface-muted rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/companies/${company.slug}`}
                          className="text-ink hover:text-brand-700 block truncate text-sm font-semibold"
                        >
                          {company.name}
                        </Link>
                        {company.tagline ? (
                          <p className="text-ink-muted mt-1 text-xs">{company.tagline}</p>
                        ) : null}
                        <p className="text-ink-muted mt-2 text-xs">
                          {tJobs("managedCompanyStats", {
                            jobs: company.counts.activeJobs,
                            members: company.counts.members,
                          })}
                        </p>
                      </div>
                      <Link
                        href={`/companies/${company.slug}/admin`}
                        className="text-brand-700 hover:text-brand-800 text-xs font-medium"
                      >
                        {tJobs("manageCompany")}
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Surface>

          <Surface variant="card" padding="4">
            <h2 className="text-ink text-base font-semibold">{tJobs("createCompany")}</h2>
            <p className="text-ink-muted mt-1 text-sm">{tJobs("createCompanyHint")}</p>

            <div className="mt-4 space-y-3">
              <Field
                label={tJobs("companyNameLabel")}
                value={companyForm.name}
                onChange={(value) => setCompanyForm((prev) => ({ ...prev, name: value }))}
              />
              <Field
                label={tJobs("companySlugLabel")}
                value={companyForm.slug}
                onChange={(value) =>
                  setCompanyForm((prev) => ({
                    ...prev,
                    slug: value.toLowerCase().replace(/\s+/g, "-"),
                  }))
                }
              />
              <Field
                label={tJobs("companyTaglineLabel")}
                value={companyForm.tagline}
                onChange={(value) => setCompanyForm((prev) => ({ ...prev, tagline: value }))}
              />
              <Field
                label={tJobs("companyWebsiteLabel")}
                value={companyForm.website}
                onChange={(value) => setCompanyForm((prev) => ({ ...prev, website: value }))}
              />
              <Field
                label={tJobs("companyIndustryLabel")}
                value={companyForm.industry}
                onChange={(value) => setCompanyForm((prev) => ({ ...prev, industry: value }))}
              />
              <Field
                label={tJobs("companyCityLabel")}
                value={companyForm.city}
                onChange={(value) => setCompanyForm((prev) => ({ ...prev, city: value }))}
              />
              <Field
                label={tJobs("companySizeLabel")}
                value={companyForm.sizeBucket}
                onChange={(value) => setCompanyForm((prev) => ({ ...prev, sizeBucket: value }))}
                placeholder={tJobs("companySizePlaceholder")}
              />
              <label className="block">
                <span className="text-ink-muted mb-1 block text-xs font-medium">
                  {tJobs("companyAboutLabel")}
                </span>
                <textarea
                  value={companyForm.about}
                  onChange={(event) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      about: event.currentTarget.value,
                    }))
                  }
                  rows={5}
                  className="border-line-hard bg-surface text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </label>

              {createError ? (
                <p className="border-danger/30 bg-danger/10 text-danger rounded-md border px-3 py-2 text-xs">
                  {createError}
                </p>
              ) : null}

              <Button
                variant="accent"
                onClick={() => void createCompany()}
                loading={creatingCompany}
              >
                {tJobs("createCompany")}
              </Button>
            </div>
          </Surface>
        </aside>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-ink-muted mb-1 block text-xs font-medium">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        className="border-line-hard bg-surface text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
      />
    </label>
  );
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: JobApplication["status"];
}): JSX.Element {
  const tone =
    status === "HIRED"
      ? "border-success/30 bg-success/10 text-success"
      : status === "REJECTED"
        ? "border-danger/30 bg-danger/10 text-danger"
        : status === "SHORTLISTED"
          ? "border-brand-600/30 bg-brand-50 text-brand-700"
          : "border-line-hard bg-surface-subtle text-ink";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function ApplicationsSkeleton(): JSX.Element {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <Surface key={item} variant="card" padding="4">
          <div className="space-y-2">
            <div className="bg-surface-sunken h-4 w-1/2 animate-pulse rounded" />
            <div className="bg-surface-sunken h-3 w-1/3 animate-pulse rounded" />
            <div className="bg-surface-sunken h-3 w-2/3 animate-pulse rounded" />
          </div>
        </Surface>
      ))}
    </div>
  );
}

function toCompanyPayload(form: CompanyFormState): CreateCompanyInput {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    country: "PS",
    tagline: emptyToUndefined(form.tagline),
    website: emptyToUndefined(form.website),
    industry: emptyToUndefined(form.industry),
    city: emptyToUndefined(form.city),
    sizeBucket: emptyToUndefined(form.sizeBucket) as CreateCompanyInput["sizeBucket"],
    about: emptyToUndefined(form.about),
  };
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
