import { z } from "zod";

import { RecommendationRelation, RecommendationStatus } from "../identity-enums";

// A named person putting their reputation behind somebody.
//
// Distinct from a Vouch, which sponsors somebody onto the craft ladder and
// costs the voucher capacity if a dispute is upheld, and from an endorsement,
// which is a counter anybody can increment. This is prose with an author on it.
//
// Two rules make it worth reading:
//   1. The subject may HIDE a published recommendation. They may never edit it.
//      A testimonial the subject can rewrite is not a testimonial.
//   2. One per (author, subject, occupation). A second testimonial from the
//      same person about the same work is not more evidence.

export const RecommendationAuthor = z.object({
  id: z.string().cuid(),
  handle: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  headline: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  /** True when the author's own PROFESSIONAL_BODY check passed — a body's
   *  testimonial is what can sponsor a rung-4 standing on its own. */
  bodyVerified: z.boolean(),
});
export type RecommendationAuthor = z.infer<typeof RecommendationAuthor>;

export const Recommendation = z.object({
  id: z.string().cuid(),
  author: RecommendationAuthor,
  subjectId: z.string().cuid(),
  relationship: z.nativeEnum(RecommendationRelation),
  occupationKey: z.string().max(80).nullable(),
  body: z.string(),
  status: z.nativeEnum(RecommendationStatus),
  hiddenBySubject: z.boolean(),
  createdAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
});
export type Recommendation = z.infer<typeof Recommendation>;

/**
 * Asking somebody to write one.
 *
 * The request carries the relationship the requester believes they had, as a
 * prompt — the author may correct it. Getting a stranger to fill in "how did
 * you know this person" from a blank field is how a request goes unanswered.
 */
export const RequestRecommendationBody = z.object({
  authorId: z.string().cuid(),
  relationship: z.nativeEnum(RecommendationRelation),
  occupationKey: z.string().min(1).max(80).optional(),
  note: z.string().max(600).optional(),
});
export type RequestRecommendationBody = z.infer<typeof RequestRecommendationBody>;

/** Writing one, unprompted or in answer to a request. */
export const WriteRecommendationBody = z.object({
  subjectId: z.string().cuid(),
  relationship: z.nativeEnum(RecommendationRelation),
  occupationKey: z.string().min(1).max(80).optional(),
  /**
   * Long enough to say something, short enough to read. Under 40 characters is
   * "great to work with", which helps nobody and dilutes the ones that mean
   * something.
   */
  body: z.string().min(40).max(3000),
});
export type WriteRecommendationBody = z.infer<typeof WriteRecommendationBody>;

/** Answering a request: write it, or decline. Declining is silent to the subject. */
export const RespondToRecommendationBody = z.object({
  action: z.enum(["PUBLISH", "DECLINE"]),
  body: z.string().min(40).max(3000).optional(),
});
export type RespondToRecommendationBody = z.infer<typeof RespondToRecommendationBody>;

/** The subject's only lever. Hide, or show again. Never edit. */
export const SetRecommendationVisibilityBody = z.object({
  hidden: z.boolean(),
});
export type SetRecommendationVisibilityBody = z.infer<typeof SetRecommendationVisibilityBody>;
