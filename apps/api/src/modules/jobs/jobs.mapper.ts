import {
  type Application as ApplicationDto,
  type Company as CompanyDto,
  type CompanyJobPreview,
  type CompanyMember as CompanyMemberDto,
  type CompanySummary,
  type Job as JobDto,
  type UserPreview,
} from "@baydar/shared";

type UserPreviewSource = {
  id: string;
  profile: {
    handle: string;
    firstName: string;
    lastName: string;
    headline: string | null;
    avatarUrl: string | null;
  } | null;
};

type CompanySummarySource = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  logoBlur: string | null;
  city: string | null;
  country: string;
};

type CompanySource = CompanySummarySource & {
  about: string | null;
  website: string | null;
  industry: string | null;
  sizeBucket: CompanyDto["sizeBucket"];
  coverUrl: string | null;
  coverBlur: string | null;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toCompanySummary(company: CompanySummarySource): CompanySummary {
  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    tagline: company.tagline,
    logoUrl: company.logoUrl,
    logoBlur: company.logoBlur,
    city: company.city,
    country: company.country,
  };
}

export function toCompanyDto(company: CompanySource): CompanyDto {
  return {
    id: company.id,
    slug: company.slug,
    name: company.name,
    tagline: company.tagline,
    about: company.about,
    website: company.website,
    industry: company.industry,
    sizeBucket: company.sizeBucket,
    logoUrl: company.logoUrl,
    logoBlur: company.logoBlur,
    coverUrl: company.coverUrl,
    coverBlur: company.coverBlur,
    country: company.country,
    city: company.city,
    verified: company.verified,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

export function toUserPreview(user: UserPreviewSource): UserPreview {
  return {
    userId: user.id,
    handle: user.profile?.handle ?? user.id,
    firstName: user.profile?.firstName ?? "",
    lastName: user.profile?.lastName ?? "",
    headline: user.profile?.headline ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}

export function toCompanyMemberDto(member: {
  id: string;
  companyId: string;
  role: CompanyMemberDto["role"];
  createdAt: Date;
  user: UserPreviewSource;
}): CompanyMemberDto {
  return {
    id: member.id,
    companyId: member.companyId,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
    user: toUserPreview(member.user),
  };
}

export function toJobDto(
  row: {
    id: string;
    companyId: string;
    postedById: string;
    title: string;
    description: string;
    type: JobDto["type"];
    locationMode: JobDto["locationMode"];
    city: string | null;
    country: string;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    skillsRequired: string[];
    isActive: boolean;
    expiresAt: Date | null;
    createdAt: Date;
    company: CompanySummarySource;
    applications: { id: string }[];
  },
  canManage: boolean,
): JobDto {
  return {
    id: row.id,
    companyId: row.companyId,
    postedById: row.postedById,
    title: row.title,
    description: row.description,
    type: row.type,
    locationMode: row.locationMode,
    city: row.city,
    country: row.country,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryCurrency: row.salaryCurrency,
    skillsRequired: row.skillsRequired,
    isActive: row.isActive,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    company: toCompanySummary(row.company),
    viewer: {
      hasApplied: row.applications.length > 0,
      canManage,
    },
  };
}

export function toCompanyJobPreview(
  row: {
    id: string;
    companyId: string;
    title: string;
    type: CompanyJobPreview["type"];
    locationMode: CompanyJobPreview["locationMode"];
    city: string | null;
    country: string;
    isActive: boolean;
    createdAt: Date;
    expiresAt: Date | null;
    applications: { id: string; applicantId: string }[];
  },
  viewerId: string,
  canManage: boolean,
): CompanyJobPreview {
  return {
    id: row.id,
    companyId: row.companyId,
    title: row.title,
    type: row.type,
    locationMode: row.locationMode,
    city: row.city,
    country: row.country,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    applicationCount: row.applications.length,
    canManage,
    viewer: {
      hasApplied: row.applications.some((application) => application.applicantId === viewerId),
    },
  };
}

export function toApplicationDto(
  row: {
    id: string;
    status: ApplicationDto["status"];
    resumeUrl: string | null;
    coverLetter: string | null;
    createdAt: Date;
    updatedAt: Date;
    applicant: UserPreviewSource;
    job: {
      id: string;
      title: string;
      type: ApplicationDto["job"]["type"];
      locationMode: ApplicationDto["job"]["locationMode"];
      city: string | null;
      company: CompanySummarySource;
    };
  },
  canManage: boolean,
): ApplicationDto {
  return {
    id: row.id,
    status: row.status,
    resumeUrl: row.resumeUrl,
    coverLetter: row.coverLetter,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    applicant: toUserPreview(row.applicant),
    job: {
      id: row.job.id,
      title: row.job.title,
      type: row.job.type,
      locationMode: row.job.locationMode,
      city: row.job.city,
    },
    company: toCompanySummary(row.job.company),
    viewer: { canManage },
  };
}
