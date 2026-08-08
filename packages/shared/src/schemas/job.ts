import { z } from "zod";

import {
  ApplicationStatus,
  JobLocationMode,
  JobType,
  PayBasis,
  REJECTION_NOTE_MAX,
  RejectionReason,
} from "../enums";
import { hasStanding, STANDING_MAX, STANDING_MIN } from "../occupations";
import { normalizeCity } from "../palestine";

/**
 * Structured requirements — docs/design/MATCHING.md §2. `skillsRequired` stays
 * free text for the long tail; `mustSkills` is the knockout subset, because
 * without a MUST/NICE split every requirement is a knockout and nobody
 * qualifies.
 */
const jobRequirements = {
  occupationKey: z.string().min(1).max(60).optional(),
  minStanding: z.number().int().min(STANDING_MIN).max(STANDING_MAX).optional(),
  requiresLicence: z.boolean().default(false),
  licenceBodyKey: z.string().min(1).max(60).optional(),
  mustSkills: z.array(z.string().min(1).max(60)).max(20).default([]),
  startsAt: z.string().datetime().optional(),
  durationDays: z.number().int().positive().max(3650).optional(),
};

/**
 * The unrefined object behind `CreateJobBody`. Exported because Zod 4 refuses
 * `.omit()` / `.partial()` on a schema carrying refinements, and the company
 * controller legitimately needs the shape minus `companyId`.
 */
export const CreateJobBodyBase = z.object({
  // Nullable at the DB level so an individual can post work with no company.
  // Employer-posted jobs still send it; the service supplies the poster.
  companyId: z.string().cuid().optional(),
  title: z.string().min(3).max(160),
  description: z.string().min(30).max(20000),
  type: z.nativeEnum(JobType),
  locationMode: z.nativeEnum(JobLocationMode),
  // canonicalize Palestinian city names so filters match across ar/en input
  city: z.string().max(120).transform(normalizeCity).optional(),
  country: z.string().length(2).default("PS"),
  // salaryMin/Max are a range *in payBasis*. MONTHLY default preserves the
  // meaning of every job posted before payBasis existed.
  payBasis: z.nativeEnum(PayBasis).default(PayBasis.MONTHLY),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  salaryCurrency: z.string().length(3).default("ILS"),
  skillsRequired: z.array(z.string().min(1).max(60)).max(20).default([]),
  expiresAt: z.string().datetime().optional(),
  ...jobRequirements,
});

export const CreateJobBody = CreateJobBodyBase
  // A minStanding on a licensed profession or a service occupation is
  // meaningless: those tracks have no ladder, and accepting it would let a job
  // advertise a rung Baydar will never award.
  .refine((v) => !v.minStanding || !v.occupationKey || hasStanding(v.occupationKey), {
    message: "MIN_STANDING_REQUIRES_CRAFT_OCCUPATION",
    path: ["minStanding"],
  })
  .refine((v) => !v.salaryMin || !v.salaryMax || v.salaryMax >= v.salaryMin, {
    message: "SALARY_RANGE_INVERTED",
    path: ["salaryMax"],
  });
export type CreateJobBody = z.infer<typeof CreateJobBody>;

export const UpdateJobBody = CreateJobBodyBase.partial().omit({ companyId: true });
export type UpdateJobBody = z.infer<typeof UpdateJobBody>;

export const Job = z.object({
  id: z.string().cuid(),
  companyId: z.string().cuid().nullable(),
  postedById: z.string().cuid(),
  title: z.string(),
  description: z.string(),
  type: z.nativeEnum(JobType),
  locationMode: z.nativeEnum(JobLocationMode),
  city: z.string().nullable(),
  country: z.string(),
  occupationKey: z.string().nullable(),
  minStanding: z.number().int().nullable(),
  requiresLicence: z.boolean(),
  licenceBodyKey: z.string().nullable(),
  payBasis: z.nativeEnum(PayBasis),
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  salaryCurrency: z.string().nullable(),
  skillsRequired: z.array(z.string()),
  mustSkills: z.array(z.string()),
  startsAt: z.string().datetime().nullable(),
  durationDays: z.number().int().nullable(),
  isActive: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  // Null when an individual posted the job rather than a business.
  company: z
    .object({
      id: z.string().cuid(),
      slug: z.string(),
      name: z.string(),
      logoUrl: z.string().url().nullable(),
    })
    .nullable(),
  // Always present: postedById is required, so every job has a human behind it.
  // This is what an individual-posted job renders instead of a company.
  poster: z.object({
    handle: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    avatarUrl: z.string().url().nullable(),
  }),
  viewer: z.object({
    hasApplied: z.boolean(),
    bookmarkId: z.string().cuid().nullable(),
    // The applicant's own outcome, on the page they come back to. There is no
    // application-history screen yet, so without this the rejection reason
    // would live only in a notification the applicant scrolls past once.
    applicationStatus: z.nativeEnum(ApplicationStatus).nullable(),
    rejectionReason: z.nativeEnum(RejectionReason).nullable(),
    rejectionNote: z.string().nullable(),
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

/**
 * A structured application — MATCHING.md §4. Every field replaces something an
 * employer currently reconstructs by reading a PDF or asking in a third message.
 * The cover letter stays optional: for a صنايعي it is a barrier, for a محاسب it
 * is a differentiator.
 */
export const ApplyToJobBody = z.object({
  resumeUrl: z.string().url().optional(),
  coverLetter: z.string().max(8000).optional(),
  screeningAnswers: z.array(z.string().max(2000)).max(10).optional(),
  expectedPay: z.number().int().positive().optional(),
  expectedPayBasis: z.nativeEnum(PayBasis).optional(),
  availableFrom: z.string().datetime().optional(),
  attachedProofIds: z.array(z.string().cuid()).max(20).default([]),
  portfolioPostIds: z.array(z.string().cuid()).max(20).default([]),
});
export type ApplyToJobBody = z.infer<typeof ApplyToJobBody>;

/**
 * Rejecting requires saying why — enforced here rather than in the two forms,
 * so no client can produce a reasonless rejection. The reason is cleared by the
 * service on any other transition, so it can never outlive the rejection it
 * explains (an un-rejected applicant must not keep a stale reason).
 */
export const UpdateApplicationStatusBody = z
  .object({
    status: z.nativeEnum(ApplicationStatus),
    rejectionReason: z.nativeEnum(RejectionReason).optional(),
    rejectionNote: z.string().trim().min(1).max(REJECTION_NOTE_MAX).optional(),
  })
  .refine((v) => v.status !== ApplicationStatus.REJECTED || !!v.rejectionReason, {
    message: "REJECTION_REASON_REQUIRED",
    path: ["rejectionReason"],
  })
  .refine((v) => v.rejectionReason !== RejectionReason.OTHER || !!v.rejectionNote, {
    message: "REJECTION_NOTE_REQUIRED",
    path: ["rejectionNote"],
  });
export type UpdateApplicationStatusBody = z.infer<typeof UpdateApplicationStatusBody>;

export const EmployerJob = z.object({
  id: z.string().cuid(),
  companyId: z.string().cuid().nullable(),
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
  rejectionReason: z.nativeEnum(RejectionReason).nullable(),
  rejectionNote: z.string().nullable(),
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

/**
 * Who a job is from — the business if there is one, otherwise the person who
 * posted it. Shared so web and mobile render an individual-posted job the same
 * way instead of each inventing a fallback.
 */
export interface JobSource {
  name: string;
  imageUrl: string | null;
  /** App-relative path to the poster's page. */
  href: string;
  isCompany: boolean;
}

export function jobSource(job: Pick<Job, "company" | "poster">): JobSource {
  if (job.company) {
    return {
      name: job.company.name,
      imageUrl: job.company.logoUrl,
      href: `/companies/${job.company.slug}`,
      isCompany: true,
    };
  }
  const { firstName, lastName, avatarUrl, handle } = job.poster;
  return {
    name: `${firstName} ${lastName}`.trim(),
    imageUrl: avatarUrl,
    href: `/in/${handle}`,
    isCompany: false,
  };
}

/**
 * How a rejection reads to the person who was rejected: the reason, and the
 * employer's note when there is one. Shared because four screens across two
 * platforms were about to repeat the same join.
 */
export function rejectionSummary(reasonLabel: string, note: string | null | undefined): string {
  return note ? `${reasonLabel} — ${note}` : reasonLabel;
}

/** First character for an avatar fallback, or "?" when there is nothing to use. */
export function jobSourceInitial(source: JobSource): string {
  return (source.name[0] ?? "?").toUpperCase();
}
