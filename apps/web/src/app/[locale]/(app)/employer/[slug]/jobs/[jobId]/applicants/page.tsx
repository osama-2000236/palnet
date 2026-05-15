"use client";

import {
  ApplicationStatus,
  Company,
  cursorPage,
  EmployerApplicant,
} from "@baydar/shared";
import { Surface } from "@baydar/ui-web";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiFetch, apiFetchPage } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";

const ApplicantsPageSchema = cursorPage(EmployerApplicant);

export default function EmployerApplicantsPage(): JSX.Element {
  const t = useTranslations("employer.applicants");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const locale = useLocale();
  const params = useParams<{ slug: string; jobId: string }>();
  const slug = params.slug;
  const jobId = params.jobId;

  const [token, setToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [items, setItems] = useState<EmployerApplicant[]>([]);
  const [filter, setFilter] = useState<ApplicationStatus | "">("");
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

  const load = useCallback(
    async (cid: string, tk: string, status: ApplicationStatus | "") => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ limit: "20" });
        if (status) qs.set("status", status);
        const page = await apiFetchPage(
          `/companies/${cid}/jobs/${jobId}/applicants?${qs.toString()}`,
          ApplicantsPageSchema,
          { token: tk },
        );
        setItems(page.data);
      } catch (e) {
        setError(toErrorMessage(e, tErr));
      } finally {
        setLoading(false);
      }
    },
    [jobId, tErr],
  );

  useEffect(() => {
    if (!token || !companyId) return;
    void load(companyId, token, filter);
  }, [token, companyId, filter, load]);

  const changeStatus = async (
    applicationId: string,
    status: ApplicationStatus,
  ): Promise<void> => {
    if (!token || !companyId) return;
    try {
      const updated = await apiFetch(
        `/companies/${companyId}/jobs/${jobId}/applicants/${applicationId}`,
        EmployerApplicant,
        { method: "PATCH", body: { status }, token },
      );
      setItems((arr) => arr.map((a) => (a.id === updated.id ? updated : a)));
    } catch (e) {
      setError(toErrorMessage(e, tErr));
    }
  };

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-6">
      <h1 className="text-ink mb-4 text-2xl font-semibold">{t("title")}</h1>

      <div className="mb-3 flex flex-wrap gap-2">
        <Chip active={filter === ""} onClick={() => setFilter("")} label="All" />
        {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((s) => (
          <Chip
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={t(`status.${s}`)}
          />
        ))}
      </div>

      {error ? <p className="text-status-danger mb-3 text-sm">{error}</p> : null}

      {loading && items.length === 0 ? (
        <p className="text-ink-muted text-sm">{tCommon("loading")}</p>
      ) : null}

      {!loading && items.length === 0 ? (
        <Surface variant="card" padding="4">
          <p className="text-ink text-sm">{t("empty")}</p>
        </Surface>
      ) : null}

      <ul className="grid grid-cols-1 gap-3">
        {items.map((a) => (
          <li key={a.id}>
            <Surface variant="card" padding="4">
              <div className="flex items-start gap-3">
                {a.applicant.profile?.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={a.applicant.profile.avatarUrl}
                    alt=""
                    className="bg-surface-muted h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="bg-surface-muted h-12 w-12 rounded-full" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-ink truncate text-base font-semibold">
                    {a.applicant.profile
                      ? `${a.applicant.profile.firstName} ${a.applicant.profile.lastName}`.trim()
                      : a.applicant.email}
                  </h2>
                  {a.applicant.profile?.headline ? (
                    <p className="text-ink-muted text-xs">{a.applicant.profile.headline}</p>
                  ) : null}
                  <p className="text-ink-muted mt-1 text-xs">
                    {t("applied")} {new Date(a.createdAt).toLocaleDateString(locale)}
                  </p>
                  {a.resumeUrl ? (
                    <a
                      href={a.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 mt-1 inline-block text-xs hover:underline"
                    >
                      {t("openResume")}
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <select
                    value={a.status}
                    onChange={(e) =>
                      void changeStatus(a.id, e.target.value as ApplicationStatus)
                    }
                    className="border-line-hard bg-surface text-ink rounded-md border px-2 py-1 text-xs"
                  >
                    {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {t(`status.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {a.coverLetter ? (
                <p className="text-ink mt-3 whitespace-pre-line text-sm">{a.coverLetter}</p>
              ) : null}
            </Surface>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Chip({
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
