import { z } from "zod";

import { ApplicationStatus, JobLocationMode, JobType } from "../enums";
import { normalizeCity } from "../palestine";

export const CreateJobBody = z.object({
  companyId: z.string().cuid(),
  title: z.string().min(3).max(160),
  description: z.string().min(30).max(20000),
  type: z.nativeEnum(JobType),
  locationMode: z.nativeEnum(JobLocationMode),
  // canonicalize Palestinian city names so filters match across ar/en input
  city: z.string().max(120).transform(normalizeCity).optional(),
  country: z.string().length(2).default("PS"),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  salaryCurrency: z.string().length(3).default("ILS"),
  skillsRequired: z.array(z.string().min(1).max(60)).max(20).default([]),
  expiresAt: z.string().datetime().optional(),
});
export type CreateJobBody = z.infer<typeof CreateJobBody>;

export const UpdateJobBody = CreateJobBody.partial().omit({ companyId: true });
export type UpdateJobBody = z.infer<typeof UpdateJobBody>;

export const Job = z.object({
  id: z.string().cuid(),
  companyId: z.string().cuid(),
  postedById: z.string().cuid(),
  title: z.string(),
  description: z.string(),
  type: z.nativeEnum(JobType),
  locationMode: z.nativeEnum(JobLocationMode),
  city: z.string().nullable(),
  country: z.string(),
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  salaryCurrency: z.string().nullable(),
  skillsRequired: z.array(z.string()),
  isActive: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  company: z.object({
    id: z.string().cuid(),
    slug: z.string(),
    name: z.string(),
    logoUrl: z.string().url().nullable(),
  }),
  viewer: z.object({
    hasApplied: z.boolean(),
    bookmarkId: z.string().cuid().nullable(),
  }),
});
export type Job = z.infer<typeof Job>;

// Public share DTO — the job without viewer-scoped fields (and without the
// poster's user id). Safe for public caching and anonymous share pages.
export const PublicJob = Job.omit({ viewer: true, postedById: true });
export type PublicJob = z.infer<typeof PublicJob>;

// ── Job alerts — saved search → notification on matching new job ──────────

export const JOB_ALERTS_MAX_PER_USER = 10;

export const JobAlert = z.object({
  id: z.string().cuid(),
  q: z.string().nullable(),
  city: z.string().nullable(),
  type: z.nativeEnum(JobType).nullable(),
  locationMode: z.nativeEnum(JobLocationMode).nullable(),
  industry: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type JobAlert = z.infer<typeof JobAlert>;

export const CreateJobAlertBody = z
  .object({
    q: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().min(1).max(120).transform(normalizeCity).optional(),
    type: z.nativeEnum(JobType).optional(),
    locationMode: z.nativeEnum(JobLocationMode).optional(),
    industry: z.string().trim().min(1).max(120).optional(),
  })
  .refine((v) => v.q || v.city || v.type || v.locationMode || v.industry, {
    message: "AT_LEAST_ONE_FILTER_REQUIRED",
  });
export type CreateJobAlertBody = z.infer<typeof CreateJobAlertBody>;

export const ApplyToJobBody = z.object({
  resumeUrl: z.string().url().optional(),
  coverLetter: z.string().max(8000).optional(),
});
export type ApplyToJobBody = z.infer<typeof ApplyToJobBody>;

export const UpdateApplicationStatusBody = z.object({
  status: z.nativeEnum(ApplicationStatus),
});
export type UpdateApplicationStatusBody = z.infer<typeof UpdateApplicationStatusBody>;

export const EmployerJob = z.object({
  id: z.string().cuid(),
  companyId: z.string().cuid(),
  title: z.string(),
  type: z.nativeEnum(JobType),
  locationMode: z.nativeEnum(JobLocationMode),
  city: z.string().nullable(),
  isActive: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  applicantCount: z.number().int().nonnegative(),
  shortlistCount: z.number().int().nonnegative(),
});
export type EmployerJob = z.infer<typeof EmployerJob>;

export const EmployerApplicant = z.object({
  id: z.string().cuid(),
  jobId: z.string().cuid(),
  applicantId: z.string().cuid(),
  status: z.nativeEnum(ApplicationStatus),
  resumeUrl: z.string().url().nullable(),
  coverLetter: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  applicant: z.object({
    id: z.string().cuid(),
    email: z.string().email(),
    profile: z
      .object({
        handle: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        headline: z.string().nullable(),
        avatarUrl: z.string().url().nullable(),
        location: z.string().nullable(),
        country: z.string().nullable(),
      })
      .nullable(),
  }),
});
export type EmployerApplicant = z.infer<typeof EmployerApplicant>;
