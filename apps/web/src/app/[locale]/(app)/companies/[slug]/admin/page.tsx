"use client";

import {
  type AddCompanyMemberBody as AddCompanyMemberInput,
  AddCompanyMemberBody,
  type Application as JobApplication,
  Application as ApplicationSchema,
  Company as CompanySchema,
  type CompanyDetail,
  CompanyDetail as CompanyDetailSchema,
  CompanyMember as CompanyMemberSchema,
  CompanyMemberRole,
  type Job,
  Job as JobSchema,
  JobLocationMode,
  JobType,
  type UpdateCompanyBody as UpdateCompanyInput,
  UpdateCompanyBody,
  type UpdateJobBody as UpdateJobInput,
  CreateJobBody,
  UpdateApplicationStatusBody,
  cursorPage,
} from "@palnet/shared";
import { Button, Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiCall, apiFetch, apiFetchPage } from "@/lib/api";
import { readSession } from "@/lib/session";
import { uploadImage } from "@/lib/uploads";

const ApplicationsPage = cursorPage(ApplicationSchema);

type CompanyFormState = {
  name: string;
  tagline: string;
  about: string;
  website: string;
  industry: string;
  sizeBucket: string;
  city: string;
  country: string;
};

type MemberFormState = {
  userId: string;
  role: AddCompanyMemberInput["role"];
};

type JobFormState = {
  title: string;
  description: string;
  type: JobType;
  locationMode: JobLocationMode;
  city: string;
  country: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  skillsRequired: string;
  expiresAt: string;
};

const EMPTY_MEMBER_FORM: MemberFormState = {
  userId: "",
  role: CompanyMemberRole.EDITOR,
};

const EMPTY_JOB_FORM: JobFormState = {
  title: "",
  description: "",
  type: JobType.FULL_TIME,
  locationMode: JobLocationMode.ONSITE,
  city: "",
  country: "PS",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "ILS",
  skillsRequired: "",
  expiresAt: "",
};

export default function CompanyAdminPage(): JSX.Element {
  const tCompany = useTranslations("company");
  const tJobs = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [token, setToken] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyFormState | null>(null);
  const [memberForm, setMemberForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [jobForm, setJobForm] = useState<JobFormState>(EMPTY_JOB_FORM);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [applicationsByJob, setApplicationsByJob] = useState<Record<string, JobApplication[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);
  const [loadingApplicantsJobId, setLoadingApplicantsJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCompany = useCallback(
    async (tk: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch(`/companies/${slug}`, CompanyDetailSchema, {
          token: tk,
        });
        setCompany(data);
        setCompanyForm({
          name: data.name,
          tagline: data.tagline ?? "",
          about: data.about ?? "",
          website: data.website ?? "",
          industry: data.industry ?? "",
          sizeBucket: data.sizeBucket ?? "",
          city: data.city ?? "",
          country: data.country,
        });
      } catch (err) {
        setError((err as Error).message || tCommon("genericError"));
      } finally {
        setLoading(false);
      }
    },
    [slug, tCommon],
  );

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
    void loadCompany(token);
  }, [token, slug, loadCompany]);

  async function uploadCompanyMedia(file: File, kind: "logo" | "cover"): Promise<void> {
    if (!token || !company) return;
    const setBusy = kind === "logo" ? setUploadingLogo : setUploadingCover;
    setBusy(true);
    setError(null);
    try {
      const { publicUrl, blurhash } = await uploadImage({
        file,
        purpose: kind === "logo" ? "COMPANY_LOGO" : "COMPANY_COVER",
        token,
      });
      const patch =
        kind === "logo"
          ? { logoUrl: publicUrl, logoBlur: blurhash ?? undefined }
          : { coverUrl: publicUrl, coverBlur: blurhash ?? undefined };
      await apiFetch(`/companies/${company.id}`, CompanySchema, {
        method: "PATCH",
        token,
        body: patch,
      });
      await loadCompany(token);
    } catch (err) {
      setError((err as Error).message || tCommon("genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function saveCompany(): Promise<void> {
    if (!token || !company || !companyForm || savingCompany) return;
    const parsed = UpdateCompanyBody.safeParse(toCompanyUpdatePayload(companyForm));
    if (!parsed.success) {
      setError(tCompany("invalidCompanyForm"));
      return;
    }
    setSavingCompany(true);
    try {
      await apiFetch(`/companies/${company.id}`, CompanySchema, {
        method: "PATCH",
        token,
        body: parsed.data,
      });
      await loadCompany(token);
    } catch (err) {
      setError((err as Error).message || tCommon("genericError"));
    } finally {
      setSavingCompany(false);
    }
  }

  async function addMember(): Promise<void> {
    if (!token || !company || savingMember) return;
    const parsed = AddCompanyMemberBody.safeParse(memberForm);
    if (!parsed.success) {
      setError(tCompany("invalidMemberForm"));
      return;
    }
    setSavingMember(true);
    try {
      await apiFetch(`/companies/${company.id}/members`, CompanyMemberSchema, {
        method: "POST",
        token,
        body: parsed.data,
      });
      setMemberForm(EMPTY_MEMBER_FORM);
      await loadCompany(token);
    } catch (err) {
      setError((err as Error).message || tCommon("genericError"));
    } finally {
      setSavingMember(false);
    }
  }

  async function removeMember(userId: string): Promise<void> {
    if (!token || !company) return;
    try {
      await apiCall(`/companies/${company.id}/members/${userId}`, {
        method: "DELETE",
        token,
      });
      await loadCompany(token);
    } catch (err) {
      setError((err as Error).message || tCommon("genericError"));
    }
  }

  async function editJob(jobId: string): Promise<void> {
    if (!token) return;
    setLoadingJobId(jobId);
    try {
      const job = await apiFetch(`/jobs/${jobId}`, JobSchema, { token });
      setEditingJobId(job.id);
      setJobForm(fromJob(job));
    } catch (err) {
      setError((err as Error).message || tCommon("genericError"));
    } finally {
      setLoadingJobId(null);
    }
  }

  async function saveJob(): Promise<void> {
    if (!token || !company || savingJob) return;
    const payload = toJobPayload(jobForm);
    const parsed = CreateJobBody.safeParse(payload);
    if (!parsed.success) {
      setError(tJobs("invalidJobForm"));
      return;
    }

    setSavingJob(true);
    try {
      if (editingJobId) {
        await apiFetch(`/jobs/${editingJobId}`, JobSchema, {
          method: "PATCH",
          token,
          body: parsed.data as UpdateJobInput,
        });
      } else {
        await apiFetch(`/companies/${company.id}/jobs`, JobSchema, {
          method: "POST",
          token,
          body: parsed.data,
        });
      }
      setEditingJobId(null);
      setJobForm(EMPTY_JOB_FORM);
      await loadCompany(token);
    } catch (err) {
      setError((err as Error).message || tCommon("genericError"));
    } finally {
      setSavingJob(false);
    }
  }

  async function closeJob(jobId: string): Promise<void> {
    if (!token) return;
    try {
      await apiCall(`/jobs/${jobId}`, { method: "DELETE", token });
      await loadCompany(token);
    } catch (err) {
      setError((err as Error).message || tCommon("genericError"));
    }
  }

  async function loadApplicants(jobId: string): Promise<void> {
    if (!token || !company) return;
    setLoadingApplicantsJobId(jobId);
    try {
      const page = await apiFetchPage(
        `/companies/${company.id}/jobs/${jobId}/applications?limit=50`,
        ApplicationsPage,
        { token },
      );
      setApplicationsByJob((prev) => ({ ...prev, [jobId]: page.data }));
    } catch (err) {
      setError((err as Error).message || tCommon("genericError"));
    } finally {
      setLoadingApplicantsJobId(null);
    }
  }

  async function updateApplicationStatus(
    jobId: string,
    applicationId: string,
    status: JobApplication["status"],
  ): Promise<void> {
    if (!token) return;
    try {
      await apiFetch(`/applications/${applicationId}/status`, ApplicationSchema, {
        method: "PATCH",
        token,
        body: UpdateApplicationStatusBody.parse({ status }),
      });
      await loadApplicants(jobId);
    } catch (err) {
      setError((err as Error).message || tCommon("genericError"));
    }
  }

  if (loading) {
    return (
      <main className="max-w-chrome mx-auto px-4 py-6">
        <Surface variant="card" padding="6">
          <p className="text-ink-muted text-sm">{tCommon("loading")}</p>
        </Surface>
      </main>
    );
  }

  if (error || !company || !companyForm) {
    return (
      <main className="max-w-chrome mx-auto px-4 py-6">
        <Surface variant="tinted" padding="6">
          <p className="text-ink-muted text-sm">{error ?? tCompany("notFound")}</p>
        </Surface>
      </main>
    );
  }

  if (!company.viewer.canEdit) {
    return (
      <main className="max-w-chrome mx-auto px-4 py-6">
        <Surface variant="tinted" padding="6">
          <p className="text-ink-muted text-sm">{tCompany("forbidden")}</p>
        </Surface>
      </main>
    );
  }

  return (
    <main className="max-w-chrome mx-auto flex w-full flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href={`/companies/${company.slug}`}
            className="text-brand-700 hover:text-brand-800 text-sm font-medium"
          >
            {company.name}
          </Link>
          <h1 className="text-ink mt-1 text-2xl font-semibold">{tCompany("adminTitle")}</h1>
        </div>
      </header>

      {error ? (
        <Surface variant="tinted" padding="4">
          <p className="text-ink-muted text-sm">{error}</p>
        </Surface>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Surface variant="card" padding="4">
            <h2 className="text-ink text-base font-semibold">{tCompany("media")}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-ink-muted mb-2 text-xs font-medium">{tCompany("cover")}</p>
                <div
                  className="border-line-soft bg-surface-muted relative h-28 w-full overflow-hidden rounded-md border"
                  style={
                    company.coverUrl
                      ? {
                          backgroundImage: `url(${company.coverUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                />
                <label className="border-line-hard bg-surface text-ink hover:bg-surface-muted mt-2 inline-block cursor-pointer rounded-md border px-3 py-2 text-xs font-medium">
                  {uploadingCover ? tCommon("loading") : tCompany("uploadCover")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploadingCover}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (file) void uploadCompanyMedia(file, "cover");
                    }}
                  />
                </label>
              </div>
              <div>
                <p className="text-ink-muted mb-2 text-xs font-medium">{tCompany("logo")}</p>
                <div className="flex items-center gap-3">
                  <div
                    className="border-line-soft bg-surface-muted h-16 w-16 shrink-0 overflow-hidden rounded-md border"
                    style={
                      company.logoUrl
                        ? {
                            backgroundImage: `url(${company.logoUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : undefined
                    }
                  />
                  <label className="border-line-hard bg-surface text-ink hover:bg-surface-muted cursor-pointer rounded-md border px-3 py-2 text-xs font-medium">
                    {uploadingLogo ? tCommon("loading") : tCompany("uploadLogo")}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={uploadingLogo}
                      className="hidden"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        if (file) void uploadCompanyMedia(file, "logo");
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </Surface>

          <Surface variant="card" padding="4">
            <h2 className="text-ink text-base font-semibold">{tCompany("editCompany")}</h2>
            <div className="mt-4 space-y-3">
              <AdminField
                label={tJobs("companyNameLabel")}
                value={companyForm.name}
                onChange={(value) =>
                  setCompanyForm((prev) => (prev ? { ...prev, name: value } : prev))
                }
              />
              <AdminField
                label={tJobs("companyTaglineLabel")}
                value={companyForm.tagline}
                onChange={(value) =>
                  setCompanyForm((prev) => (prev ? { ...prev, tagline: value } : prev))
                }
              />
              <AdminField
                label={tJobs("companyWebsiteLabel")}
                value={companyForm.website}
                onChange={(value) =>
                  setCompanyForm((prev) => (prev ? { ...prev, website: value } : prev))
                }
              />
              <AdminField
                label={tJobs("companyIndustryLabel")}
                value={companyForm.industry}
                onChange={(value) =>
                  setCompanyForm((prev) => (prev ? { ...prev, industry: value } : prev))
                }
              />
              <AdminField
                label={tJobs("companySizeLabel")}
                value={companyForm.sizeBucket}
                onChange={(value) =>
                  setCompanyForm((prev) => (prev ? { ...prev, sizeBucket: value } : prev))
                }
              />
              <AdminField
                label={tJobs("companyCityLabel")}
                value={companyForm.city}
                onChange={(value) =>
                  setCompanyForm((prev) => (prev ? { ...prev, city: value } : prev))
                }
              />
              <label className="block">
                <span className="text-ink-muted mb-1 block text-xs font-medium">
                  {tJobs("companyAboutLabel")}
                </span>
                <textarea
                  value={companyForm.about}
                  onChange={(event) => {
                    const { value } = event.currentTarget;
                    return setCompanyForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            about: value,
                          }
                        : prev,
                    );
                  }}
                  rows={6}
                  className="border-line-hard bg-surface text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </label>
              <Button variant="accent" onClick={() => void saveCompany()} loading={savingCompany}>
                {tCompany("saveCompany")}
              </Button>
            </div>
          </Surface>

          {company.viewer.canManage ? (
            <Surface variant="card" padding="4">
              <h2 className="text-ink text-base font-semibold">{tCompany("members")}</h2>
              <div className="mt-4 space-y-3">
                <AdminField
                  label={tCompany("memberUserId")}
                  value={memberForm.userId}
                  onChange={(value) => setMemberForm((prev) => ({ ...prev, userId: value }))}
                  placeholder={tCompany("memberUserIdPlaceholder")}
                />
                <label className="block">
                  <span className="text-ink-muted mb-1 block text-xs font-medium">
                    {tCompany("memberRole")}
                  </span>
                  <select
                    value={memberForm.role}
                    onChange={(event) =>
                      setMemberForm((prev) => ({
                        ...prev,
                        role: event.currentTarget.value as MemberFormState["role"],
                      }))
                    }
                    className="border-line-hard bg-surface text-ink focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  >
                    {Object.values(CompanyMemberRole).map((role) => (
                      <option key={role} value={role}>
                        {tCompany(`memberRoles.${role}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <Button variant="secondary" onClick={() => void addMember()} loading={savingMember}>
                  {tCompany("addMember")}
                </Button>
              </div>

              <ul className="mt-4 space-y-3">
                {company.members.map((member) => (
                  <li
                    key={member.id}
                    className="border-line-soft bg-surface-muted flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/in/${member.user.handle}`}
                        className="text-ink hover:text-brand-700 block truncate text-sm font-semibold"
                      >
                        {member.user.firstName} {member.user.lastName}
                      </Link>
                      <p className="text-ink-muted mt-1 text-xs">{member.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeMember(member.user.userId)}
                      className="text-danger hover:text-danger/80 text-xs font-medium"
                    >
                      {tCompany("removeMember")}
                    </button>
                  </li>
                ))}
              </ul>
            </Surface>
          ) : null}
        </div>

        <div className="space-y-6">
          <Surface variant="card" padding="4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-ink text-base font-semibold">
                {editingJobId ? tJobs("editJob") : tJobs("createJob")}
              </h2>
              {editingJobId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingJobId(null);
                    setJobForm(EMPTY_JOB_FORM);
                  }}
                  className="text-ink-muted hover:text-ink text-sm font-medium"
                >
                  {tCommon("cancel")}
                </button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <AdminField
                label={tJobs("jobTitleLabel")}
                value={jobForm.title}
                onChange={(value) => setJobForm((prev) => ({ ...prev, title: value }))}
              />
              <AdminField
                label={tJobs("companyCityLabel")}
                value={jobForm.city}
                onChange={(value) => setJobForm((prev) => ({ ...prev, city: value }))}
              />
              <SelectField
                label={tJobs("type")}
                value={jobForm.type}
                onChange={(value) =>
                  setJobForm((prev) => ({
                    ...prev,
                    type: value as JobType,
                  }))
                }
                options={Object.values(JobType).map((type) => ({
                  value: type,
                  label: tJobs(`typeLabels.${type}`),
                }))}
              />
              <SelectField
                label={tJobs("location")}
                value={jobForm.locationMode}
                onChange={(value) =>
                  setJobForm((prev) => ({
                    ...prev,
                    locationMode: value as JobLocationMode,
                  }))
                }
                options={Object.values(JobLocationMode).map((mode) => ({
                  value: mode,
                  label: tJobs(`locationLabels.${mode}`),
                }))}
              />
              <AdminField
                label={tJobs("salaryMinLabel")}
                type="number"
                value={jobForm.salaryMin}
                onChange={(value) => setJobForm((prev) => ({ ...prev, salaryMin: value }))}
              />
              <AdminField
                label={tJobs("salaryMaxLabel")}
                type="number"
                value={jobForm.salaryMax}
                onChange={(value) => setJobForm((prev) => ({ ...prev, salaryMax: value }))}
              />
              <AdminField
                label={tJobs("salaryCurrencyLabel")}
                value={jobForm.salaryCurrency}
                onChange={(value) => setJobForm((prev) => ({ ...prev, salaryCurrency: value }))}
              />
              <AdminField
                label={tJobs("jobCountryLabel")}
                value={jobForm.country}
                onChange={(value) => setJobForm((prev) => ({ ...prev, country: value }))}
              />
              <AdminField
                label={tJobs("skillsListLabel")}
                value={jobForm.skillsRequired}
                onChange={(value) => setJobForm((prev) => ({ ...prev, skillsRequired: value }))}
                placeholder={tJobs("skillsListPlaceholder")}
              />
              <AdminField
                label={tJobs("expiresAtLabel")}
                type="datetime-local"
                value={jobForm.expiresAt}
                onChange={(value) => setJobForm((prev) => ({ ...prev, expiresAt: value }))}
              />
            </div>
            <label className="mt-3 block">
              <span className="text-ink-muted mb-1 block text-xs font-medium">
                {tJobs("description")}
              </span>
              <textarea
                value={jobForm.description}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  return setJobForm((prev) => ({
                    ...prev,
                    description: value,
                  }));
                }}
                rows={8}
                className="border-line-hard bg-surface text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <Button variant="accent" onClick={() => void saveJob()} loading={savingJob}>
                {editingJobId ? tJobs("saveJob") : tJobs("createJob")}
              </Button>
            </div>
          </Surface>

          <Surface variant="card" padding="4">
            <h2 className="text-ink text-base font-semibold">{tCompany("jobs")}</h2>
            <div className="mt-4 space-y-4">
              {company.jobs.map((job) => (
                <div
                  key={job.id}
                  className="border-line-soft bg-surface-muted rounded-lg border p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-ink hover:text-brand-700 block text-sm font-semibold"
                      >
                        {job.title}
                      </Link>
                      <p className="text-ink-muted mt-1 text-xs">
                        {[
                          job.city,
                          tJobs(`locationLabels.${job.locationMode}`),
                          tJobs(`typeLabels.${job.type}`),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="text-ink-muted mt-2 text-xs">
                        {tJobs("applicationCount", { count: job.applicationCount })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void editJob(job.id)}
                        className="border-line-hard bg-surface text-ink hover:bg-surface rounded-md border px-3 py-2 text-xs font-medium"
                      >
                        {loadingJobId === job.id ? tCommon("loading") : tJobs("editJob")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void closeJob(job.id)}
                        className="border-danger/30 bg-danger/10 text-danger hover:bg-danger/20 rounded-md border px-3 py-2 text-xs font-medium"
                      >
                        {tJobs("closeJob")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void loadApplicants(job.id)}
                        className="border-brand-600/30 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-md border px-3 py-2 text-xs font-medium"
                      >
                        {loadingApplicantsJobId === job.id
                          ? tCommon("loading")
                          : tJobs("loadApplicants")}
                      </button>
                    </div>
                  </div>

                  {applicationsByJob[job.id]?.length ? (
                    <ul className="mt-4 space-y-3">
                      {(applicationsByJob[job.id] ?? []).map((application) => (
                        <li
                          key={application.id}
                          className="border-line-soft bg-surface rounded-md border p-3"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <Link
                                href={`/in/${application.applicant.handle}`}
                                className="text-ink hover:text-brand-700 block text-sm font-semibold"
                              >
                                {application.applicant.firstName} {application.applicant.lastName}
                              </Link>
                              {application.applicant.headline ? (
                                <p className="text-ink-muted mt-1 text-xs">
                                  {application.applicant.headline}
                                </p>
                              ) : null}
                              {application.coverLetter ? (
                                <p className="text-ink-muted mt-2 text-sm">
                                  {application.coverLetter}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-start gap-2">
                              <span className="border-line-hard bg-surface-subtle text-ink rounded-full border px-2.5 py-1 text-xs font-semibold">
                                {tJobs(`applicationStatusLabels.${application.status}`)}
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {["REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"].map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() =>
                                      void updateApplicationStatus(
                                        job.id,
                                        application.id,
                                        status as JobApplication["status"],
                                      )
                                    }
                                    className="border-line-hard bg-surface text-ink hover:bg-surface-muted text-nav rounded-md border px-2.5 py-1 font-medium"
                                  >
                                    {tJobs(`applicationStatusLabels.${status}`)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : applicationsByJob[job.id] ? (
                    <p className="text-ink-muted mt-4 text-sm">{tJobs("noApplicants")}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Surface>
        </div>
      </section>
    </main>
  );
}

function AdminField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-ink-muted mb-1 block text-xs font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        className="border-line-hard bg-surface text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-ink-muted mb-1 block text-xs font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="border-line-hard bg-surface text-ink focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function toCompanyUpdatePayload(form: CompanyFormState): UpdateCompanyInput {
  return {
    name: form.name.trim(),
    country: form.country.trim() || "PS",
    tagline: emptyToUndefined(form.tagline),
    about: emptyToUndefined(form.about),
    website: emptyToUndefined(form.website),
    industry: emptyToUndefined(form.industry),
    sizeBucket: emptyToUndefined(form.sizeBucket) as UpdateCompanyInput["sizeBucket"],
    city: emptyToUndefined(form.city),
  };
}

function toJobPayload(form: JobFormState): UpdateJobInput {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    locationMode: form.locationMode,
    city: emptyToUndefined(form.city),
    country: form.country.trim() || "PS",
    salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
    salaryCurrency: emptyToUndefined(form.salaryCurrency),
    skillsRequired: form.skillsRequired
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean),
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
  };
}

function fromJob(job: Job): JobFormState {
  return {
    title: job.title,
    description: job.description,
    type: job.type,
    locationMode: job.locationMode,
    city: job.city ?? "",
    country: job.country,
    salaryMin: job.salaryMin?.toString() ?? "",
    salaryMax: job.salaryMax?.toString() ?? "",
    salaryCurrency: job.salaryCurrency ?? "ILS",
    skillsRequired: job.skillsRequired.join(", "),
    expiresAt: job.expiresAt ? toLocalDateTimeValue(job.expiresAt) : "",
  };
}

function toLocalDateTimeValue(value: string): string {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
