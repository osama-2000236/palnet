"use client";

import {
  type CompanyDetail,
  CompanyDetail as CompanyDetailSchema,
} from "@palnet/shared";
import { CompanyPageSkeleton, Image, Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { readSession } from "@/lib/session";

export default function CompanyPage(): JSX.Element {
  const tCompany = useTranslations("company");
  const tJobs = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [token, setToken] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  useEffect(() => {
    if (!token || !slug) return;
    setLoading(true);
    setError(null);
    void apiFetch(`/companies/${slug}`, CompanyDetailSchema, { token })
      .then((data) => setCompany(data))
      .catch((err) => setError((err as Error).message || tCommon("genericError")))
      .finally(() => setLoading(false));
  }, [token, slug, tCommon]);

  if (loading) {
    return <CompanyPageSkeleton />;
  }

  if (error || !company) {
    return (
      <main className="mx-auto max-w-[960px] px-4 py-6">
        <Surface variant="tinted" padding="6">
          <p className="text-sm text-ink-muted">{error ?? tCompany("notFound")}</p>
        </Surface>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-4 px-4 py-6">
      {company.coverUrl ? (
        <Image
          src={company.coverUrl}
          alt=""
          blurhash={company.coverBlur ?? null}
          wrapperClassName="h-44 w-full rounded-xl border border-line-soft md:h-56"
        />
      ) : null}
      <Surface variant="hero" padding="6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-surface-sunken text-xl font-semibold text-ink-muted">
                {company.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (company.name[0] ?? "?").toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold text-ink">
                  {company.name}
                </h1>
                {company.tagline ? (
                  <p className="mt-1 text-sm text-ink-muted">{company.tagline}</p>
                ) : null}
                <p className="mt-2 text-xs text-ink-muted">
                  {[company.city, company.country].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-muted">
              <span className="rounded-full bg-surface px-3 py-1">
                {tCompany("memberCount", { count: company.counts.members })}
              </span>
              <span className="rounded-full bg-surface px-3 py-1">
                {tCompany("activeJobsCount", { count: company.counts.activeJobs })}
              </span>
            </div>
          </div>

          {company.viewer.canEdit ? (
            <Link
              href={`/companies/${company.slug}/admin`}
              className="inline-flex rounded-md border border-brand-600 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
            >
              {tCompany("manage")}
            </Link>
          ) : null}
        </div>
      </Surface>

      <Surface variant="card" padding="6">
        <h2 className="text-base font-semibold text-ink">{tCompany("about")}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
          {company.about ?? tCompany("aboutEmpty")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          {company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-700 hover:text-brand-800"
            >
              {tCompany("visitWebsite")}
            </a>
          ) : null}
          {company.industry ? (
            <span className="text-ink-muted">{company.industry}</span>
          ) : null}
        </div>
      </Surface>

      <Surface variant="card" padding="6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{tCompany("jobs")}</h2>
          <Link
            href="/jobs"
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            {tJobs("browseJobs")}
          </Link>
        </div>

        {company.jobs.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{tCompany("jobsEmpty")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {company.jobs.map((job) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="block">
                  <div className="rounded-lg border border-line-soft bg-surface-muted p-4 transition hover:border-brand-300">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-ink">{job.title}</h3>
                        <p className="mt-1 text-xs text-ink-muted">
                          {[job.city, tJobs(`locationLabels.${job.locationMode}`), tJobs(`typeLabels.${job.type}`)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {job.viewer.hasApplied ? (
                          <span className="rounded-full border border-success/30 bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">
                            {tJobs("appliedBadge")}
                          </span>
                        ) : null}
                        {!job.isActive ? (
                          <span className="rounded-full border border-line-hard bg-surface px-2 py-1 text-[11px] text-ink-muted">
                            {tCompany("closedJob")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      {company.viewer.canManage && company.members.length > 0 ? (
        <Surface variant="card" padding="6">
          <h2 className="text-base font-semibold text-ink">{tCompany("members")}</h2>
          <ul className="mt-4 space-y-3">
            {company.members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-surface-muted p-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/in/${member.user.handle}`}
                    className="block truncate text-sm font-semibold text-ink hover:text-brand-700"
                  >
                    {member.user.firstName} {member.user.lastName}
                  </Link>
                  <p className="mt-1 text-xs text-ink-muted">{member.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </main>
  );
}
