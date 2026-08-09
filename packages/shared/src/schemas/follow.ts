import { z } from "zod";

// The asymmetric edge.
//
// Baydar had exactly one edge type — Connection, mutual, requiring acceptance —
// which caps the diaspora's participation at the size of their existing address
// book. 8.82 million Palestinians abroad mostly do not know each other and never
// will. With 280,000 unemployed in the West Bank, a connection request from a
// stranger is noise an employer has to triage; a follow costs them nothing.
//
// Register, and it is not negotiable: **متابعة** is follow, **تواصل** is
// connect. The two words must never be swapped and must never appear on the
// same button.

export const FollowTargetType = {
  USER: "USER",
  COMPANY: "COMPANY",
  TOPIC: "TOPIC",
} as const;
export type FollowTargetType = (typeof FollowTargetType)[keyof typeof FollowTargetType];

export const FollowTarget = z
  .object({
    targetType: z.nativeEnum(FollowTargetType),
    targetUserId: z.string().cuid().nullish(),
    targetCompanyId: z.string().cuid().nullish(),
    targetTopicKey: z.string().min(1).max(80).nullish(),
  })
  // Exactly one, checked here as well as by the database: a body with two
  // targets would otherwise be counted twice and never uncounted.
  .refine(
    (t) =>
      [t.targetUserId, t.targetCompanyId, t.targetTopicKey].filter(
        (value) => value !== null && value !== undefined,
      ).length === 1,
    { message: "Exactly one of targetUserId, targetCompanyId, targetTopicKey." },
  )
  .refine(
    (t) =>
      (t.targetType === "USER" && !!t.targetUserId) ||
      (t.targetType === "COMPANY" && !!t.targetCompanyId) ||
      (t.targetType === "TOPIC" && !!t.targetTopicKey),
    { message: "targetType must match which target is set." },
  );
export type FollowTarget = z.infer<typeof FollowTarget>;

export const FollowBody = FollowTarget;
export type FollowBody = z.infer<typeof FollowBody>;

/**
 * The one string that identifies a follow target.
 *
 * Both `Follow` and `FollowerCount` key on this rather than on the three
 * nullable columns, for two reasons that are really one: Postgres treats NULLs
 * in a unique index as distinct — so `(me, USER, u2, NULL, NULL)` inserts
 * twice and the counter counts both — and Prisma cannot build a primary key
 * from nullable fields at all.
 *
 * Derived in `@baydar/shared` so the client, the API and the migration all
 * spell it identically. A second spelling is a second follow.
 */
export function followTargetKey(target: {
  targetType: FollowTargetType;
  targetUserId?: string | null;
  targetCompanyId?: string | null;
  targetTopicKey?: string | null;
}): string {
  switch (target.targetType) {
    case FollowTargetType.USER:
      return `USER:${target.targetUserId ?? ""}`;
    case FollowTargetType.COMPANY:
      return `COMPANY:${target.targetCompanyId ?? ""}`;
    case FollowTargetType.TOPIC:
      return `TOPIC:${target.targetTopicKey ?? ""}`;
  }
}

/**
 * How the viewer relates to this person, both ways.
 *
 * `followsYou` is what makes a follow-back button possible, and it is the
 * cheapest useful signal in an asymmetric graph — somebody who followed you is
 * the most likely person to accept a connection.
 */
export const FollowState = z.object({
  following: z.boolean(),
  followsYou: z.boolean(),
});
export type FollowState = z.infer<typeof FollowState>;

export const FollowerCounts = z.object({
  followers: z.number().int().nonnegative(),
  following: z.number().int().nonnegative(),
});
export type FollowerCounts = z.infer<typeof FollowerCounts>;

/**
 * How far away somebody is.
 *
 * Only degree 2 is stored. Degree 3 renders as "3rd+" without proof, which is
 * honest enough and costs nothing — the alternative is a three-hop join per
 * card.
 */
export const DegreeBadge = z.enum(["self", "1st", "2nd", "3rd+"]);
export type DegreeBadge = z.infer<typeof DegreeBadge>;

export const MutualConnections = z.object({
  count: z.number().int().nonnegative(),
  /** A few faces for the stacked row. Never the whole list. */
  sample: z
    .array(
      z.object({
        userId: z.string().cuid(),
        handle: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        avatarUrl: z.string().url().nullable(),
      }),
    )
    .max(3),
});
export type MutualConnections = z.infer<typeof MutualConnections>;

/**
 * The three fields every person-shaped DTO gains.
 *
 * One schema rather than three repeated fields, so a DTO either has all of it
 * or none — a card that knows the degree but not the follow state renders a
 * button it cannot label.
 */
export const PersonGraphState = z.object({
  degree: DegreeBadge,
  mutualCount: z.number().int().nonnegative(),
  followState: FollowState,
});
export type PersonGraphState = z.infer<typeof PersonGraphState>;

/** What a person's graph state looks like before anything is known. */
export const UNKNOWN_GRAPH_STATE: PersonGraphState = {
  degree: "3rd+",
  mutualCount: 0,
  followState: { following: false, followsYou: false },
};

// ── List rows ──────────────────────────────────────────────────────────────

export const FollowPerson = z.object({
  userId: z.string().cuid(),
  handle: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  headline: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type FollowPerson = z.infer<typeof FollowPerson>;

/**
 * One row of a follow list.
 *
 * Exactly one of `user` / `company` / `topicKey` is set, mirroring the edge —
 * a row shaped like the table is a row nobody has to reconcile.
 */
export const FollowRow = z.object({
  id: z.string().cuid(),
  targetType: z.nativeEnum(FollowTargetType),
  createdAt: z.string().datetime(),
  user: FollowPerson.nullable(),
  company: z
    .object({
      id: z.string().cuid(),
      slug: z.string(),
      name: z.string(),
      logoUrl: z.string().url().nullable(),
    })
    .nullable(),
  topicKey: z.string().nullable(),
});
export type FollowRow = z.infer<typeof FollowRow>;

export const FollowListQuery = z.object({
  targetType: z.nativeEnum(FollowTargetType).optional(),
});
export type FollowListQuery = z.infer<typeof FollowListQuery>;
