"use client";

import {
  localeTag,
  ApplicationStatus,
  Company,
  cursorPage,
  EmployerApplicant,
  rejectionSummary,
  type RejectionReason,
} from "@baydar/shared";
import { Alert, EmptyState, Surface } from "@baydar/ui-web";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiFetch, apiFetchPage } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";
import { RejectDialog } from "./_components/RejectDialog";

const ApplicantsPageSchema = cursorPage(EmployerApplicant);

export default function EmployerApplicantsPage(): JSX.Element {
  const t = useTranslations("employer.applicants");
  const tReasons = useTranslations("employer.rejectionReasons");
  const tReject = useTranslations("employer.reject");
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
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectBusy, setRejectBusy] = useState(false);

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
      setError(null);
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
    rejection?: { rejectionReason: RejectionReason; rejectionNote?: string },
  ): Promise<void> => {
    if (!token || !companyId) return;
    try {
      const updated = await apiFetch(
        `/companies/${companyId}/jobs/${jobId}/applicants/${applicationId}`,
        EmployerApplicant,
        { method: "PATCH", body: { status, ...rejection }, token },
      );
      setItems((arr) => arr.map((a) => (a.id === updated.id ? updated : a)));
    } catch (e) {
      setError(toErrorMessage(e, tErr));
    }
  };

  // REJECTED cannot be sent straight from the dropdown — the API requires a
  // reason with it, so the selection opens the dialog and the dialog sends.
  const onSelectStatus = (applicationId: string, status: ApplicationStatus): void => {
    if (status === ApplicationStatus.REJECTED) {
      setRejecting(applicationId);
      return;
    }
    void changeStatus(applicationId, status);
  };

  const confirmReject = async (reason: RejectionReason, note?: string): Promise<void> => {
    if (!rejecting) return;
    setRejectBusy(true);
    await changeStatus(rejecting, ApplicationStatus.REJECTED, {
      rejectionReason: reason,
      ...(note ? { rejectionNote: note } : {}),
    });
    setRejectBusy(false);
    setRejecting(null);
  };

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-6">
      <h1 className="text-ink mb-4 text-2xl font-semibold">{t("title")}</h1>

      <div className="mb-3 flex flex-wrap gap-2">
        <Chip active={filter === ""} onClick={() => setFilter("")} label={t("allFilter")} />
        {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((s) => (
          <Chip
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={t(`status.${s}`)}
          />
        ))}
      </div>

      {/* Was a bare red sentence, and the empty state rendered right under it:
          "no applicants yet" is an answer this screen did not have. */}
      {error ? (
        <Alert
          kind="danger"
          body={error}
          cta={tCommon("retry")}
          onAction={() => token && companyId && void load(companyId, token, filter)}
          className="mb-3"
        />
      ) : null}

      {loading && items.length === 0 ? (
        <p className="text-ink-muted text-sm">{tCommon("loading")}</p>
      ) : null}

      {/* Rubric hierarchy 6: this was one bare line of text under the filter
          row, on the screen an employer reaches first — right after posting
          their first job and before anyone has applied — while every other
          empty state in the product (employer, settings/blocked, moderation,
          billing, saved) gets the shared illustrated one.
          The filtered case is separated because the two mean different things:
          "nobody has applied yet" needs direction, "nobody matches this filter"
          needs a way back. */}
      {!loading && !error && items.length === 0 ? (
        filter === "" ? (
          <EmptyState motif="network" title={t("empty")} body={t("emptyBody")} />
        ) : (
          <EmptyState
            variant="inline"
            motif="search"
            title={t("emptyFiltered")}
            cta={t("emptyFilteredCta")}
            onAction={() => setFilter("")}
          />
        )
      ) : null}

      <ul className="grid grid-cols-1 gap-3">
        {items.map((a) => (
          <li key={a.id}>
            <Surface variant="card" padding="4">
              <div className="flex items-start gap-3">
                {a.applicant.profile?.avatarUrl ? (
                  <Image
                    src={a.applicant.profile.avatarUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="bg-surface-muted h-12 w-12 rounded-full object-cover"
                    sizes="48px"
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
                    {t("applied")} {new Date(a.createdAt).toLocaleDateString(localeTag(locale))}
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
                    onChange={(e) => onSelectStatus(a.id, e.target.value as ApplicationStatus)}
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
              {a.rejectionReason ? (
                <p className="text-ink-muted mt-2 text-xs">
                  {tReject("rejectedFor")}{" "}
                  {rejectionSummary(tReasons(a.rejectionReason), a.rejectionNote)}
                </p>
              ) : null}
              {a.coverLetter ? (
                <p className="text-ink mt-3 whitespace-pre-line text-sm">{a.coverLetter}</p>
              ) : null}
            </Surface>
          </li>
        ))}
      </ul>

      <RejectDialog
        open={rejecting !== null}
        busy={rejectBusy}
        onClose={() => setRejecting(null)}
        onConfirm={(reason, note) => void confirmReject(reason, note)}
      />
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
