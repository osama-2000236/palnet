import { z } from "zod";

import { ApplicationStatus, JobLocationMode, JobType } from "../enums";

import { CompanySummary, UserPreview } from "./company";

export const CreateJobBody = z.object({
  title: z.string().min(3).max(160),
  description: z.string().min(30).max(20000),
  type: z.nativeEnum(JobType),
  locationMode: z.nativeEnum(JobLocationMode),
  city: z.string().max(120).optional(),
  country: z.string().length(2).default("PS"),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  salaryCurrency: z.string().length(3).default("ILS"),
  skillsRequired: z.array(z.string().min(1).max(60)).max(20).default([]),
  expiresAt: z.string().datetime().optional(),
});
export type CreateJobBody = z.infer<typeof CreateJobBody>;

export const UpdateJobBody = CreateJobBody.partial();
export type UpdateJobBody = z.infer<typeof UpdateJobBody>;

export const JobViewerState = z.object({
  hasApplied: z.boolean(),
  canManage: z.boolean(),
});
export type JobViewerState = z.infer<typeof JobViewerState>;

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
  company: CompanySummary,
  viewer: JobViewerState,
});
export type Job = z.infer<typeof Job>;

export const ApplyToJobBody = z.object({
  resumeUrl: z.string().url().optional(),
  coverLetter: z.string().max(8000).optional(),
});
export type ApplyToJobBody = z.infer<typeof ApplyToJobBody>;

export const UpdateApplicationStatusBody = z.object({
  status: z.nativeEnum(ApplicationStatus),
});
export type UpdateApplicationStatusBody = z.infer<typeof UpdateApplicationStatusBody>;

export const ApplicationJobSummary = z.object({
  id: z.string().cuid(),
  title: z.string(),
  type: z.nativeEnum(JobType),
  locationMode: z.nativeEnum(JobLocationMode),
  city: z.string().nullable(),
});
export type ApplicationJobSummary = z.infer<typeof ApplicationJobSummary>;

export const Application = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(ApplicationStatus),
  resumeUrl: z.string().url().nullable(),
  coverLetter: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  applicant: UserPreview,
  job: ApplicationJobSummary,
  company: CompanySummary,
  viewer: z.object({
    canManage: z.boolean(),
  }),
});
export type Application = z.infer<typeof Application>;

export const JobSearchQuery = z.object({
  q: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  type: z.nativeEnum(JobType).optional(),
  locationMode: z.nativeEnum(JobLocationMode).optional(),
  skills: z.array(z.string()).max(10).optional(),
});
export type JobSearchQuery = z.infer<typeof JobSearchQuery>;
