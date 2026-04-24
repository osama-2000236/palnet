import { z } from "zod";

import { CompanyMemberRole, JobLocationMode, JobType } from "../enums";

export const CompanySlug = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, { message: "INVALID_SLUG" });

const SizeBucket = z.enum([
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001+",
]);

export const CreateCompanyBody = z.object({
  slug: CompanySlug,
  name: z.string().min(1).max(120),
  tagline: z.string().max(220).optional(),
  about: z.string().max(8000).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(120).optional(),
  sizeBucket: SizeBucket.optional(),
  logoUrl: z.string().url().optional(),
  logoBlur: z.string().max(64).optional(),
  coverUrl: z.string().url().optional(),
  coverBlur: z.string().max(64).optional(),
  country: z.string().length(2).default("PS"),
  city: z.string().max(120).optional(),
});
export type CreateCompanyBody = z.infer<typeof CreateCompanyBody>;

export const UpdateCompanyBody = CreateCompanyBody.partial().omit({ slug: true });
export type UpdateCompanyBody = z.infer<typeof UpdateCompanyBody>;

export const UserPreview = z.object({
  userId: z.string().cuid(),
  handle: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  headline: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type UserPreview = z.infer<typeof UserPreview>;

export const Company = z.object({
  id: z.string().cuid(),
  slug: CompanySlug,
  name: z.string().min(1).max(120),
  tagline: z.string().max(220).nullable(),
  about: z.string().max(8000).nullable(),
  website: z.string().url().nullable(),
  industry: z.string().max(120).nullable(),
  sizeBucket: SizeBucket.nullable(),
  logoUrl: z.string().url().nullable(),
  logoBlur: z.string().max(64).nullable(),
  coverUrl: z.string().url().nullable(),
  coverBlur: z.string().max(64).nullable(),
  country: z.string().length(2),
  city: z.string().max(120).nullable(),
  verified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Company = z.infer<typeof Company>;

export const CompanySummary = Company.pick({
  id: true,
  slug: true,
  name: true,
  tagline: true,
  logoUrl: true,
  logoBlur: true,
  city: true,
  country: true,
});
export type CompanySummary = z.infer<typeof CompanySummary>;

export const CompanyViewerState = z.object({
  canManage: z.boolean(),
  canEdit: z.boolean(),
  role: z.nativeEnum(CompanyMemberRole).nullable(),
});
export type CompanyViewerState = z.infer<typeof CompanyViewerState>;

export const CompanyCounts = z.object({
  members: z.number().int().nonnegative(),
  activeJobs: z.number().int().nonnegative(),
});
export type CompanyCounts = z.infer<typeof CompanyCounts>;

export const AddCompanyMemberBody = z.object({
  userId: z.string().cuid(),
  role: z.nativeEnum(CompanyMemberRole).default("EDITOR"),
});
export type AddCompanyMemberBody = z.infer<typeof AddCompanyMemberBody>;

export const CompanyMember = z.object({
  id: z.string().cuid(),
  companyId: z.string().cuid(),
  role: z.nativeEnum(CompanyMemberRole),
  createdAt: z.string().datetime(),
  user: UserPreview,
});
export type CompanyMember = z.infer<typeof CompanyMember>;

export const CompanyJobPreview = z.object({
  id: z.string().cuid(),
  companyId: z.string().cuid(),
  title: z.string(),
  type: z.nativeEnum(JobType),
  locationMode: z.nativeEnum(JobLocationMode),
  city: z.string().nullable(),
  country: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  applicationCount: z.number().int().nonnegative(),
  canManage: z.boolean(),
  viewer: z.object({
    hasApplied: z.boolean(),
  }),
});
export type CompanyJobPreview = z.infer<typeof CompanyJobPreview>;

export const CompanyDetail = Company.extend({
  viewer: CompanyViewerState,
  counts: CompanyCounts,
  jobs: z.array(CompanyJobPreview).default([]),
  members: z.array(CompanyMember).default([]),
});
export type CompanyDetail = z.infer<typeof CompanyDetail>;

export const ManagedCompany = CompanySummary.extend({
  viewer: CompanyViewerState,
  counts: CompanyCounts,
});
export type ManagedCompany = z.infer<typeof ManagedCompany>;
