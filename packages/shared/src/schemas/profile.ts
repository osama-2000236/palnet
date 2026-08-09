import { z } from "zod";

import { JobLocationMode } from "../enums";
import { AddressGender } from "../identity-enums";
import { normalizeCity } from "../palestine";
import {
  CareerBreak,
  Certificate,
  Honor,
  ProfileLanguage,
  ProfileTranslation,
  Publication,
  VolunteerRole,
} from "./profile-sections";

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

export const EndorseSkillResult = z.object({
  endorsements: z.number().int().nonnegative(),
  awardedKarama: z.boolean(),
});
export type EndorseSkillResult = z.infer<typeof EndorseSkillResult>;

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
  // canonicalize Palestinian city names (ar/en → canonical ar); passes others through
  location: z
    .string()
    .max(120)
    .transform((v) => normalizeCity(v))
    .nullish(),
  country: z.string().length(2).default("PS"),
  // Where this member IS, as opposed to where they are from. `country` carried
  // both meanings and could not carry both: 8.82 million Palestinians abroad
  // against 5.56 million at home makes those two different questions, and the
  // whole diaspora surface depends on being able to ask each one separately.
  //
  // `country` is not dropped in this release. Two-release rule -- DEPRECATIONS
  // .json holds the removal, and until then both are written.
  residenceCountry: z.string().length(2).default("PS"),
  /** A PS_GOVERNORATES key. The one thing the diaspora reliably shares. */
  originGovernorate: z.string().max(80).nullish(),
  diasporaVisible: z.boolean().default(true),
  avatarUrl: z.string().url().nullish(),
  coverUrl: z.string().url().nullish(),
  website: z.string().url().nullish(),
  pronouns: z.string().max(40).nullish(),
  /**
   * How to address this member in Arabic. A rendering input, not a pronoun:
   * a second-person imperative addressed to a woman is a different word, and
   * getting it wrong in every string is what a native speaker notices first.
   */
  addressGender: z.nativeEnum(AddressGender).nullish(),
  openToWork: z.boolean(),
  hiring: z.boolean(),
  /** Cached; recomputed on write, never on read. Orders a candidate list an
   *  employer already opened, and nothing else. */
  evidenceScore: z.number().int().min(0).max(100).default(0),
  careerBreak: CareerBreak.nullish(),
  experiences: z.array(Experience).default([]),
  educations: z.array(Education).default([]),
  skills: z.array(Skill).default([]),
  certificates: z.array(Certificate).default([]),
  languages: z.array(ProfileLanguage).default([]),
  volunteerRoles: z.array(VolunteerRole).default([]),
  honors: z.array(Honor).default([]),
  publications: z.array(Publication).default([]),
  translations: z.array(ProfileTranslation).default([]),
  viewer: ViewerProfileState.optional(),
});
export type Profile = z.infer<typeof Profile>;

// The sections have their own routes: a PUT of the whole profile that carried
// twenty certificates would make every edit a race with itself, and on 2G it
// would make every edit a 40KB upload.
//
// `evidenceScore` is omitted because it is computed. A client that could set it
// could buy it, and Rule 1 is not enforced by asking nicely.
export const UpdateProfileBody = Profile.omit({
  id: true,
  userId: true,
  evidenceScore: true,
  experiences: true,
  educations: true,
  skills: true,
  certificates: true,
  languages: true,
  volunteerRoles: true,
  honors: true,
  publications: true,
  translations: true,
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
  location: z.string().max(120).transform(normalizeCity).optional(),
  country: z.string().length(2).default("PS"),
});
export type OnboardProfileBody = z.infer<typeof OnboardProfileBody>;
