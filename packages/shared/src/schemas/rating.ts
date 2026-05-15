import { z } from "zod";

export const RatingContext = {
  CANDIDATE_RATES_EMPLOYER: "CANDIDATE_RATES_EMPLOYER",
  EMPLOYER_RATES_CANDIDATE: "EMPLOYER_RATES_CANDIDATE",
} as const;
export type RatingContext = (typeof RatingContext)[keyof typeof RatingContext];

export const CreateRatingBody = z.object({
  rateeId: z.string().cuid(),
  context: z.nativeEnum(RatingContext),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  jobId: z.string().cuid().optional(),
  applicationId: z.string().cuid().optional(),
});
export type CreateRatingBody = z.infer<typeof CreateRatingBody>;

export const UserRating = z.object({
  id: z.string().cuid(),
  raterId: z.string().cuid(),
  rateeId: z.string().cuid(),
  context: z.nativeEnum(RatingContext),
  score: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  jobId: z.string().cuid().nullable(),
  applicationId: z.string().cuid().nullable(),
  createdAt: z.string().datetime(),
  rater: z.object({
    id: z.string().cuid(),
    profile: z
      .object({
        handle: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        avatarUrl: z.string().url().nullable(),
      })
      .nullable(),
  }),
});
export type UserRating = z.infer<typeof UserRating>;

export const RatingSummary = z.object({
  userId: z.string().cuid(),
  context: z.nativeEnum(RatingContext),
  average: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
});
export type RatingSummary = z.infer<typeof RatingSummary>;
