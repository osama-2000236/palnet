// Why this person, and not that one.
//
// The suggestion endpoint today has no occupation, governorate or alumni
// signal — it returns people. FEED-RANKING.md's explainability rule
// generalises: if the product cannot say why it is showing somebody, it does
// not show them. So every candidate carries the reason it scored.
//
// A pure function over a closed input, which is the fairness enforcement.
// Nothing here reads the database, and nothing money-shaped can reach it —
// Rule 1 — because no such field exists on the input type.
// `check-ranking-purity.mjs` scans the service that calls this, and the closed
// type is what makes that scan sufficient. This comment does not spell the
// banned words, because the gate is absolute inside a ranker and it is right
// to be: an exception ledger here is the first step to an exception.

export const SuggestionReason = {
  SHARED_CONNECTIONS: "SHARED_CONNECTIONS",
  SAME_FAMILY: "SAME_FAMILY",
  ALUMNI: "ALUMNI",
  NEARBY: "NEARBY",
  COWORKER: "COWORKER",
  SAME_ORIGIN: "SAME_ORIGIN",
  FOLLOWS_YOU: "FOLLOWS_YOU",
  ESTABLISHED: "ESTABLISHED",
} as const;
export type SuggestionReason = (typeof SuggestionReason)[keyof typeof SuggestionReason];

/**
 * Everything the scorer may know.
 *
 * Closed on purpose, and a test asserts its exact key set. Widening it is how
 * a ranking input nobody argued for arrives — which is the failure Rule 1
 * exists to prevent, and the reason this type is not `Record<string, unknown>`.
 */
export interface SuggestionInput {
  /** First-degree connections in common, uncapped; the term saturates at 8. */
  mutuals: number;
  sameOccupationFamily: boolean;
  /** Same institution AND overlapping years. Either alone is not an alumnus. */
  alumniOverlap: boolean;
  /** 0..1 from `proximityScore` — 0 means a different region, not far away. */
  proximity: number;
  sharedCompanyEver: boolean;
  /** Both abroad, from the same governorate. The diaspora's own signal. */
  sameOriginGovernorate: boolean;
  candidateFollowsViewer: boolean;
  /** 0..100. Evidence of finished work, not of paying. */
  evidenceScore: number;
}

const MUTUALS_SATURATION = 8;

/** Weight per term. The order here is the tie-break order for the reason. */
const WEIGHTS = [
  { reason: SuggestionReason.SHARED_CONNECTIONS, weight: 22 },
  { reason: SuggestionReason.SAME_FAMILY, weight: 18 },
  { reason: SuggestionReason.ALUMNI, weight: 14 },
  { reason: SuggestionReason.NEARBY, weight: 12 },
  { reason: SuggestionReason.COWORKER, weight: 10 },
  { reason: SuggestionReason.SAME_ORIGIN, weight: 8 },
  { reason: SuggestionReason.FOLLOWS_YOU, weight: 8 },
  { reason: SuggestionReason.ESTABLISHED, weight: 8 },
] as const;

/** Each term's 0..1 strength, before its weight. */
function strengths(input: SuggestionInput): Record<SuggestionReason, number> {
  return {
    SHARED_CONNECTIONS:
      Math.min(Math.max(input.mutuals, 0), MUTUALS_SATURATION) / MUTUALS_SATURATION,
    SAME_FAMILY: input.sameOccupationFamily ? 1 : 0,
    ALUMNI: input.alumniOverlap ? 1 : 0,
    NEARBY: Math.min(Math.max(input.proximity, 0), 1),
    COWORKER: input.sharedCompanyEver ? 1 : 0,
    SAME_ORIGIN: input.sameOriginGovernorate ? 1 : 0,
    FOLLOWS_YOU: input.candidateFollowsViewer ? 1 : 0,
    ESTABLISHED: Math.min(Math.max(input.evidenceScore, 0), 100) / 100,
  };
}

export function suggestionScore(input: SuggestionInput): number {
  const term = strengths(input);
  return WEIGHTS.reduce((total, { reason, weight }) => total + weight * term[reason], 0);
}

/**
 * The reason a card shows.
 *
 * The highest-weighted term that is not zero — not the highest-scoring one. A
 * candidate with one mutual connection scores 2.75 on SHARED_CONNECTIONS and
 * 18 on SAME_FAMILY, and «معرفة مشتركة» is still the more useful thing to say
 * than «نفس المجال»: it names a person, and a person is checkable.
 *
 * Null when every term is zero, which means there is no reason and the
 * candidate is not shown at all.
 */
export function suggestionReason(input: SuggestionInput): SuggestionReason | null {
  const term = strengths(input);
  return WEIGHTS.find(({ reason }) => term[reason] > 0)?.reason ?? null;
}

/**
 * Order two scored candidates.
 *
 * Ties break on evidence, then on recency — never on anything a member could
 * buy. Returns the comparator's sign, for `Array.prototype.sort`.
 */
export function compareSuggestions(
  a: { score: number; evidenceScore: number; createdAt: number },
  b: { score: number; evidenceScore: number; createdAt: number },
): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.evidenceScore !== a.evidenceScore) return b.evidenceScore - a.evidenceScore;
  return b.createdAt - a.createdAt;
}
