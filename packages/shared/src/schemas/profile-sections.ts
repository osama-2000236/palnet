import { z } from "zod";

import { CareerBreakReason, LanguageLevel } from "../identity-enums";

// The rest of a professional life.
//
// A profile with only jobs and schools on it describes a graduate of a system
// that hires graduates. Most of the people this product is for have a licence,
// a course certificate, three languages, ten years of volunteering, and a gap
// they did not choose. All of that is evidence, and none of it had anywhere to
// go.

/**
 * A non-statutory training credential.
 *
 * Renders as a certificate and NEVER as a licence: a licence is issued by a
 * نقابة with statutory force, and calling a two-day course certificate one is
 * a legal exposure rather than a wording preference. `Licence` is the separate
 * model for the real thing.
 */
export const Certificate = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(160),
  issuerName: z.string().min(1).max(160),
  /** A known issuer key, when the issuer is one we can spell consistently. */
  issuerKey: z.string().max(80).nullable(),
  credentialId: z.string().max(120).nullable(),
  credentialUrl: z.string().url().nullable(),
  issuedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
});
export type Certificate = z.infer<typeof Certificate>;

export const CertificateBody = Certificate.omit({ id: true }).extend({
  issuerKey: z.string().max(80).nullish(),
  credentialId: z.string().max(120).nullish(),
  credentialUrl: z.string().url().nullish(),
  issuedAt: z.string().datetime().nullish(),
  expiresAt: z.string().datetime().nullish(),
});
export type CertificateBody = z.infer<typeof CertificateBody>;

/**
 * A language and how well it is spoken.
 *
 * Self-reported and labelled as such — Baydar runs no language test, and an
 * unlabelled self-report is the kind of small lie that makes a whole profile
 * untrustworthy. Keyed by BCP-47 primary subtag, so one member has one row per
 * language and re-adding updates it.
 */
export const ProfileLanguage = z.object({
  languageKey: z
    .string()
    .min(2)
    .max(8)
    .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, { message: "INVALID_LANGUAGE_KEY" }),
  proficiency: z.nativeEnum(LanguageLevel),
});
export type ProfileLanguage = z.infer<typeof ProfileLanguage>;

export const ProfileLanguageBody = ProfileLanguage;
export type ProfileLanguageBody = z.infer<typeof ProfileLanguageBody>;

/**
 * Unpaid work somebody did.
 *
 * `causeKey` is a closed, short list describing WORK, not "causes you care
 * about" — the second thing is a personality quiz and this is a CV section.
 */
export const VOLUNTEER_CAUSE_KEYS = [
  "EDUCATION",
  "RELIEF",
  "HEALTH",
  "COMMUNITY",
  "ENVIRONMENT",
  "RIGHTS",
] as const;
export const VolunteerCauseKey = z.enum(VOLUNTEER_CAUSE_KEYS);
export type VolunteerCauseKey = z.infer<typeof VolunteerCauseKey>;

export const VolunteerRole = z.object({
  id: z.string().cuid(),
  role: z.string().min(1).max(120),
  organisation: z.string().min(1).max(160),
  causeKey: VolunteerCauseKey.nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
  description: z.string().max(2000).nullable(),
});
export type VolunteerRole = z.infer<typeof VolunteerRole>;

export const VolunteerRoleBody = VolunteerRole.omit({ id: true }).extend({
  causeKey: VolunteerCauseKey.nullish(),
  endDate: z.string().datetime().nullish(),
  description: z.string().max(2000).nullish(),
});
export type VolunteerRoleBody = z.infer<typeof VolunteerRoleBody>;

export const Honor = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(160),
  issuerName: z.string().min(1).max(160),
  awardedAt: z.string().datetime().nullable(),
  description: z.string().max(2000).nullable(),
});
export type Honor = z.infer<typeof Honor>;

export const HonorBody = Honor.omit({ id: true }).extend({
  awardedAt: z.string().datetime().nullish(),
  description: z.string().max(2000).nullish(),
});
export type HonorBody = z.infer<typeof HonorBody>;

export const Publication = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(240),
  venue: z.string().max(160).nullable(),
  url: z.string().url().nullable(),
  publishedAt: z.string().datetime().nullable(),
});
export type Publication = z.infer<typeof Publication>;

export const PublicationBody = Publication.omit({ id: true }).extend({
  venue: z.string().max(160).nullish(),
  url: z.string().url().nullish(),
  publishedAt: z.string().datetime().nullish(),
});
export type PublicationBody = z.infer<typeof PublicationBody>;

/**
 * The profile in a second language, written by the member.
 *
 * The diaspora applies to jobs in English; the local market reads Arabic. Both
 * are the same person and neither is a translation of the other — a machine
 * translation of a headline in a hiring context is worse than having none, and
 * this is why the member writes it.
 */
export const ProfileTranslation = z.object({
  locale: z.enum(["en"]),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  headline: z.string().max(220).nullable(),
  about: z.string().max(4000).nullable(),
});
export type ProfileTranslation = z.infer<typeof ProfileTranslation>;

export const ProfileTranslationBody = ProfileTranslation.omit({ locale: true }).extend({
  headline: z.string().max(220).nullish(),
  about: z.string().max(4000).nullish(),
});
export type ProfileTranslationBody = z.infer<typeof ProfileTranslationBody>;

/**
 * A named gap.
 *
 * Displacement and detention are not edge cases in this market. A CV with two
 * unexplained years reads as unemployability to every reader who has not lived
 * here; the only fix is to let the gap be named, which is why the reason list
 * includes the two words nobody else's product will print.
 *
 * `to` may be null — an ongoing break is a fact, not an unfinished form.
 */
export const CareerBreak = z.object({
  from: z.string().datetime(),
  to: z.string().datetime().nullable(),
  reason: z.nativeEnum(CareerBreakReason),
});
export type CareerBreak = z.infer<typeof CareerBreak>;

export const CareerBreakBody = CareerBreak.extend({
  to: z.string().datetime().nullish(),
}).refine((b) => !b.to || new Date(b.to) >= new Date(b.from), {
  message: "CAREER_BREAK_ENDS_BEFORE_IT_STARTS",
  path: ["to"],
});
export type CareerBreakBody = z.infer<typeof CareerBreakBody>;
