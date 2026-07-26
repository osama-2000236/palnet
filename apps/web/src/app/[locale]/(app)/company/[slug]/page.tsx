"use client";

import {
  Company,
  cursorPage,
  formatSalaryRange,
  Job as JobSchema,
  type Company as CompanyDto,
  type Job,
} from "@baydar/shared";
import { Alert, Button, Skeleton, Surface } from "@baydar/ui-web";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { JobListRow } from "../../jobs/_components/JobListRow";
import { apiFetch, apiFetchPage, getValidAccessToken } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";

const JobsPage = cursorPage(JobSchema);

export default function CompanyPage(): JSX.Element {
  const t = useTranslations("company");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [company, setCompany] = useState<CompanyDto | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const token = await getValidAccessToken();
    if (!token) return;
    setError(null);
    try {
      const nextCompany = await apiFetch(`/companies/${encodeURIComponent(slug)}`, Company, {
        token,
      });
      const jobsPage = await apiFetchPage(`/jobs?companyId=${nextCompany.id}&limit=10`, JobsPage, {
        token,
      });
      setCompany(nextCompany);
      setJobs(jobsPage.data);
    } catch (caught) {
      setError(toErrorMessage(caught, tErrors));
    } finally {
      setLoading(false);
    }
  }, [slug, tErrors]);

  useEffect(() => {
    void load();
  }, [load]);

  // Country is stored as an ISO region code ("PS") — render its localized
  // name; fall back to the raw code for anything Intl doesn't know.
  const countryName = company?.country
    ? (new Intl.DisplayNames([locale], { type: "region" }).of(company.country) ?? company.country)
    : null;
  const location = company
    ? [company.city, countryName].filter(Boolean).join(locale.startsWith("ar") ? "، " : ", ")
    : "";

  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-6 py-8">
      {loading ? (
        <div
          className="flex flex-col gap-4"
          role="status"
          aria-busy="true"
          aria-label={tCommon("loading")}
        >
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error || !company ? (
        <Alert
          kind="danger"
          action={
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              {tCommon("retry")}
            </Button>
          }
        >
          {t("loadError")}
        </Alert>
      ) : (
        <>
          <Surface as="header" variant="hero" padding="6" className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div
                className="bg-surface-sunken text-ink flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg text-xl font-bold"
                aria-hidden="true"
              >
                {company.logoUrl ? (
                  <Image
                    src={company.logoUrl}
                    alt=""
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                ) : (
                  (company.name[0] ?? "?").toUpperCase()
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="text-ink flex items-center gap-2 text-2xl font-bold">
                  {company.name}
                  {company.verified ? (
                    <span className="text-brand-700 text-xs font-semibold">{t("verified")}</span>
                  ) : null}
                </h1>
                {company.tagline ? (
                  <p className="text-ink-muted text-sm">{company.tagline}</p>
                ) : null}
                <p className="text-ink-muted text-xs">
                  {[company.industry, location].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer noopener"
                className="text-brand-700 self-start text-sm font-semibold underline"
              >
                {t("visitWebsite")}
              </a>
            ) : null}
          </Surface>

          {company.about ? (
            <Surface as="section" variant="flat" padding="6" className="flex flex-col gap-2">
              <h2 className="text-ink text-lg font-semibold">{t("about")}</h2>
              <p className="text-ink whitespace-pre-wrap text-sm">{company.about}</p>
            </Surface>
          ) : null}

          <Surface as="section" variant="flat" padding="6" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-ink text-lg font-semibold">{t("openJobs")}</h2>
              {jobs.length > 0 ? (
                <Link
                  href={`/${locale}/jobs?companyId=${company.id}&company=${encodeURIComponent(company.name)}`}
                  className="text-brand-700 min-h-target inline-flex items-center text-sm font-semibold underline"
                >
                  {t("viewAllJobs")}
                </Link>
              ) : null}
            </div>
            {jobs.length === 0 ? (
              <p className="text-ink-muted text-sm">{t("noJobs")}</p>
            ) : (
              <ul>
                {jobs.map((job) => (
                  <li key={job.id} className="border-line-soft border-b last:border-b-0">
                    <JobListRow
                      job={job}
                      salary={formatSalaryRange(
                        job.salaryMin,
                        job.salaryMax,
                        job.salaryCurrency ?? "USD",
                        locale,
                      )}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </>
      )}
    </main>
  );
}
