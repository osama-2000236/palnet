// The candidate row: what discovery selects, and how it reads.
//
// Split from the query layer for the reason `occupations-data.ts` is split
// from `occupations.ts` — this file changes when the profile shape does, and
// `discovery.service.ts` when the rules do. It also puts the service back
// under the 300-LOC design ceiling.

import { governorateOfCity } from "@baydar/shared";
import type { PeopleSuggestion } from "@baydar/shared";

export interface ViewerContext {
  location: string | null;
  governorate: string | null;
  occupationFamily: string | null;
  schools: Set<string>;
  companies: Set<string>;
}

export const CANDIDATE_SELECT = {
  userId: true,
  handle: true,
  firstName: true,
  lastName: true,
  headline: true,
  avatarUrl: true,
  location: true,
  user: { select: { createdAt: true } },
  educations: { select: { school: true } },
  experiences: { select: { companyName: true } },
  // The occupation lives on OccupationClaim, not on Profile. Primary first,
  // because a member with three claims has one they lead with.
  claims: {
    where: { isPrimary: true },
    take: 1,
    select: { occupationKey: true },
  },
} as const;

export type CandidateRow = {
  userId: string;
  handle: string;
  firstName: string;
  lastName: string;
  headline: string | null;
  avatarUrl: string | null;
  location: string | null;
  user: { createdAt: Date };
  educations: Array<{ school: string }>;
  experiences: Array<{ companyName: string }>;
  claims: Array<{ occupationKey: string }>;
};

export const personOf = (row: CandidateRow) => ({
  userId: row.userId,
  handle: row.handle,
  firstName: row.firstName,
  lastName: row.lastName,
  headline: row.headline,
  avatarUrl: row.avatarUrl,
});

/** The occupation a member leads with, or null when they have claimed none. */
export const occupationKeyOf = (row: CandidateRow): string | null =>
  row.claims[0]?.occupationKey ?? null;

/** Case- and whitespace-insensitive, because members type these by hand. */
export const normalise = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

/** What the reason line names, when it names something. */
export function reasonKeyFor(
  reason: PeopleSuggestion["reason"],
  candidate: CandidateRow,
  viewer: ViewerContext,
): string | null {
  if (reason === "SAME_FAMILY") return occupationKeyOf(candidate);
  if (reason === "ALUMNI") {
    return (
      candidate.educations.find((e) => viewer.schools.has(normalise(e.school)))?.school ?? null
    );
  }
  if (reason === "NEARBY" || reason === "SAME_ORIGIN") return governorateOfCity(candidate.location);
  return null;
}
