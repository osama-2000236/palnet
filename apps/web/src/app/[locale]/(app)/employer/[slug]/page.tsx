"use client";

import { Company, cursorPage, EmployerJob, formatNumber } from "@baydar/shared";
import { Alert, Surface } from "@baydar/ui-web";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiCall, apiFetch, apiFetchPage } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";

const JobsPage = cursorPage(EmployerJob);

type Filter = "active" | "archived";

export default function CompanyDashboardPage(): JSX.Element {
  const t = useTranslations("employer.dashboard");
  const tBillingEmployer = useTranslations("billing.employer");
  const tCommon = useTranslations("common");
  const tJobs = useTranslations("jobs");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const locale = useLocale();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [token, setToken] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<EmployerJob[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = readSession();
    if (!s) {
      router.replace(`/${locale}/login`);
      return;
    }
    setToken(s.tokens.accessToken);
  }, [router, locale]);

  const loadJobs = useCallback(
    async (tk: string, currentFilter: Filter) => {
      setLoading(true);
      setError(null);
      try {
        const page = await apiFetchPage(
          `/companies/${encodeURIComponent(company?.id ?? slug)}/jobs?status=${currentFilter}&limit=20`,
          JobsPage,
          { token: tk },
        );
        setJobs(page.data);
      } catch (e) {
        setError(toErrorMessage(e, tErr));
      } finally {
        setLoading(false);
      }
    },
    [company, slug, tErr],
  );

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const c = await apiFetch(`/companies/${encodeURIComponent(slug)}`, Company, {
          token,
        });
        setCompany(c);
      } catch (e) {
        setError(toErrorMessage(e, tErr));
      }
    })();
  }, [token, slug, tErr]);

  useEffect(() => {
    if (!token || !company) return;
    void loadJobs(token, filter);
  }, [token, company, filter, loadJobs]);

  const onArchive = async (jobId: string): Promise<void> => {
    if (!token || !company) return;
    try {
      await apiCall(`/companies/${company.id}/jobs/${jobId}/archive`, {
        method: "POST",
        token,
      });
      void loadJobs(token, filter);
    } catch (e) {
      setError(toErrorMessage(e, tErr));
    }
  };

  const activeJobs = jobs.filter((j) => j.isActive).length;
  const totalApplicants = jobs.reduce((s, j) => s + j.applicantCount, 0);
  const totalShortlist = jobs.reduce((s, j) => s + j.shortlistCount, 0);

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-ink text-2xl font-semibold">{company?.name ?? slug}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/employer/${slug}/billing`}
            className="border-line-hard text-ink hover:bg-surface-subtle inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold"
          >
            {tBillingEmployer("billingLink")}
          </Link>
          <Link
            href={`/${locale}/employer/${slug}/jobs/new`}
            className="bg-brand-500 hover:bg-brand-600 inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold text-white"
          >
            {t("createJob")}
          </Link>
        </div>
      </header>

      {/* Zero is a number, and on a failed load it is the wrong one: this row
          reported "0 active jobs, 0 applicants, 0 shortlisted" beside the error
          that said nothing had loaded. */}
      {error ? null : (
        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi label={t("activeJobs")} value={formatNumber(activeJobs, locale)} />
          <Kpi label={t("totalApplicants")} value={formatNumber(totalApplicants, locale)} />
          <Kpi label={t("openShortlist")} value={formatNumber(totalShortlist, locale)} />
        </section>
      )}

      <div className="mb-3 flex gap-2">
        <FilterChip
          active={filter === "active"}
          onClick={() => setFilter("active")}
          label={t("filterActive")}
        />
        <FilterChip
          active={filter === "archived"}
          onClick={() => setFilter("archived")}
          label={t("filterArchived")}
        />
      </div>

      {error ? (
        <Alert
          kind="danger"
          body={error}
          cta={tCommon("retry")}
          onAction={() => token && void loadJobs(token, filter)}
          className="mb-3"
        />
      ) : null}

      {loading && jobs.length === 0 ? (
        <p className="text-ink-muted text-sm">{tCommon("loading")}</p>
      ) : null}

      {!loading && !error && jobs.length === 0 ? (
        <Surface variant="card" padding="4">
          <p className="text-ink text-sm">{t("noJobs")}</p>
        </Surface>
      ) : null}

      <ul className="grid grid-cols-1 gap-3">
        {jobs.map((j) => (
          <li key={j.id}>
            <Surface variant="card" padding="4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-ink truncate text-base font-semibold">{j.title}</h2>
                  {/* These rendered the raw enums ("FULL_TIME · HYBRID") and
                      hardcoded English ("3 applicants · 1 shortlist") on an
                      Arabic-first product. `jobs.typeLabels` and
                      `jobs.locationLabels` already existed and are what the
                      public job pages use. */}
                  <p className="text-ink-muted text-xs">
                    {tJobs(`typeLabels.${j.type}`)} · {tJobs(`locationLabels.${j.locationMode}`)}
                    {j.city ? ` · ${j.city}` : ""}
                  </p>
                  <p className="text-ink-muted mt-1 text-xs">
                    {t("applicantCount", { count: j.applicantCount })} ·{" "}
                    {t("shortlistCount", { count: j.shortlistCount })}
                    {j.isActive ? "" : ` · ${t("archived")}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/${locale}/employer/${slug}/jobs/${j.id}/applicants`}
                    className="text-brand-600 text-sm hover:underline"
                  >
                    {t("viewApplicants")}
                  </Link>
                  {j.isActive ? (
                    <button
                      type="button"
                      onClick={() => onArchive(j.id)}
                      className="text-ink-muted hover:text-ink text-xs"
                    >
                      {t("archive")}
                    </button>
                  ) : null}
                </div>
              </div>
            </Surface>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Surface variant="card" padding="4">
      <p className="text-ink-muted text-xs">{label}</p>
      <p className="text-ink text-2xl font-semibold">{value}</p>
    </Surface>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active ? "bg-brand-500 text-white" : "bg-surface-muted text-ink"
      }`}
    >
      {label}
    </button>
  );
}
