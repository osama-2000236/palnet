import { z } from "zod";

import { SAFETY } from "../safety/thresholds";

// Who looked at your profile — without ever naming them.
//
// LinkedIn sells named viewers. Baydar does not, and this is not a pricing
// decision: in a market this small, "an employer from your governorate viewed
// you" plus a date is enough to identify one person, and a member who learns
// their current employer looked has learned something dangerous.
//
// So: daily counts, plus breakdowns that are suppressed below k=5. A member
// with three viewers is told they had three viewers and nothing else.

export const ProfileViewDay = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  views: z.number().int().nonnegative(),
});
export type ProfileViewDay = z.infer<typeof ProfileViewDay>;

/**
 * A breakdown bucket. `key` is an occupation or governorate key, never a name.
 *
 * Only buckets at or above `SAFETY.PROFILE_VIEW_K` appear. The remainder is
 * reported as `suppressed` rather than dropped — a total that does not add up
 * is how a member works out what was hidden.
 */
export const ProfileViewBucket = z.object({
  key: z.string(),
  count: z.number().int().min(SAFETY.PROFILE_VIEW_K),
});
export type ProfileViewBucket = z.infer<typeof ProfileViewBucket>;

export const ProfileViewSummary = z.object({
  totalViews: z.number().int().nonnegative(),
  days: z.array(ProfileViewDay),
  byOccupation: z.array(ProfileViewBucket),
  byGovernorate: z.array(ProfileViewBucket),
  /** Views that fell in buckets too small to show. Named, not silently lost. */
  suppressedViews: z.number().int().nonnegative(),
});
export type ProfileViewSummary = z.infer<typeof ProfileViewSummary>;

export const ProfileViewsQuery = z.object({
  /** 7, 30 or 90 days. Longer windows re-identify by accumulation. */
  days: z.coerce
    .number()
    .int()
    .refine((d) => [7, 30, 90].includes(d), {
      message: "INVALID_WINDOW",
    }),
});
export type ProfileViewsQuery = z.infer<typeof ProfileViewsQuery>;

/**
 * Drop every bucket below k and account for what was dropped.
 *
 * Shared rather than living in the service, because the mobile client renders
 * the same summary and a second implementation of a privacy rule is a second
 * chance to get it wrong.
 */
export function anonymiseBuckets(
  counts: Record<string, number>,
  k: number = SAFETY.PROFILE_VIEW_K,
): { buckets: ProfileViewBucket[]; suppressed: number } {
  const buckets: ProfileViewBucket[] = [];
  let suppressed = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count >= k) buckets.push({ key, count });
    else suppressed += count;
  }
  buckets.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return { buckets, suppressed };
}
