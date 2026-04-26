import { z } from "zod";
import { JobLocationMode } from "../enums";

// Handle: /in/<handle> — lowercase ascii, digits, dash; 3-30 chars; unique.
export const Handle = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, { message: "INVALID_HANDLE" });

export const Experience = z.object({
  id: z.string().cuid().optional(),
  title: z.string().min(1).max(120),
  companyName: z.string().min(1).max(120),
  companyId: z.string().cuid().nullish(),
  location: z.string().max(120).nullish(),
  locationMode: z.nativeEnum(JobLocationMode).default("ONSITE"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullish(),
  description: z.string().max(4000).nullish(),
});
export type Experience = z.infer<typeof Experience>;

export const Education = z.object({
  id: z.string().cuid().optional(),
  school: z.string().min(1).max(120),
  degree: z.string().max(120).nullish(),
  fieldOfStudy: z.string().max(120).nullish(),
  startDate: z.string().datetime().nullish(),
  endDate: z.string().datetime().nullish(),
  description: z.string().max(4000).nullish(),
});
export type Education = z.infer<typeof Education>;

export const Skill = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(60),
  slug: z.string(),
  endorsements: z.number().int().nonnegative().default(0),
});
export type Skill = z.infer<typeof Skill>;

export const ViewerProfileState = z.object({
  isSelf: z.boolean(),
  connection: z
    .object({
      status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "WITHDRAWN", "BLOCKED"]),
      direction: z.enum(["OUTGOING", "INCOMING"]),
      connectionId: z.string().cuid(),
    })
    .nullable(),
});
export type ViewerProfileState = z.infer<typeof ViewerProfileState>;

export const Profile = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  handle: Handle,
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  headline: z.string().max(220).nullish(),
  about: z.string().max(4000).nullish(),
  location: z.string().max(120).nullish(),
  country: z.string().length(2).default("PS"),
  avatarUrl: z.string().url().nullish(),
  coverUrl: z.string().url().nullish(),
  website: z.string().url().nullish(),
  pronouns: z.string().max(40).nullish(),
  openToWork: z.boolean(),
  hiring: z.boolean(),
  experiences: z.array(Experience).default([]),
  educations: z.array(Education).default([]),
  skills: z.array(Skill).default([]),
  viewer: ViewerProfileState.optional(),
});
export type Profile = z.infer<typeof Profile>;

export const UpdateProfileBody = Profile.omit({
  id: true,
  userId: true,
  experiences: true,
  educations: true,
  skills: true,
}).partial();
export type UpdateProfileBody = z.infer<typeof UpdateProfileBody>;

// ──────────────────────────────────────────────────────────────────────────
// Nested CRUD bodies (used by /profiles/me/{experiences,educations,skills})
// ──────────────────────────────────────────────────────────────────────────

export const ExperienceBody = Experience.omit({ id: true });
export type ExperienceBody = z.infer<typeof ExperienceBody>;

export const EducationBody = Education.omit({ id: true });
export type EducationBody = z.infer<typeof EducationBody>;

// Add a skill by free-form name — server find-or-creates the Skill row,
// then upserts the (profile, skill) association.
export const AddSkillBody = z.object({
  name: z.string().min(1).max(60),
});
export type AddSkillBody = z.infer<typeof AddSkillBody>;

export const OnboardProfileBody = z.object({
  handle: Handle,
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  headline: z.string().max(220).optional(),
  location: z.string().max(120).optional(),
  country: z.string().length(2).default("PS"),
});
export type OnboardProfileBody = z.infer<typeof OnboardProfileBody>;
