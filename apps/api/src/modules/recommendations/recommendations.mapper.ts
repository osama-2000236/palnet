import type { Recommendation } from "@baydar/shared";

export interface RecommendationRow {
  id: string;
  subjectId: string;
  relationship: Recommendation["relationship"];
  /** "" for a general testimonial. `null` is what goes on the wire. */
  occupationKey: string;
  body: string;
  status: Recommendation["status"];
  hiddenBySubject: boolean;
  createdAt: Date;
  respondedAt: Date | null;
  author: {
    id: string;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      headline: string | null;
      avatarUrl: string | null;
    } | null;
    verifications: Array<{ method: string }>;
  };
}

/**
 * The author's own PROFESSIONAL_BODY check comes along for the ride.
 *
 * It is not decoration: a body-verified author's testimonial can sponsor a
 * rung-4 standing on its own, so the reader is entitled to see which kind of
 * author wrote this one.
 */
export const recommendationInclude = {
  author: {
    select: {
      id: true,
      profile: {
        select: {
          handle: true,
          firstName: true,
          lastName: true,
          headline: true,
          avatarUrl: true,
        },
      },
      verifications: {
        where: { method: "PROFESSIONAL_BODY" as const, status: "VERIFIED" as const },
        select: { method: true },
      },
    },
  },
} as const;

export function toRecommendationDto(row: RecommendationRow): Recommendation {
  const profile = row.author.profile;
  return {
    id: row.id,
    author: {
      id: row.author.id,
      handle: profile?.handle ?? "",
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      headline: profile?.headline ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      bodyVerified: row.author.verifications.length > 0,
    },
    subjectId: row.subjectId,
    relationship: row.relationship,
    occupationKey: row.occupationKey || null,
    body: row.body,
    status: row.status,
    hiddenBySubject: row.hiddenBySubject,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
  };
}
