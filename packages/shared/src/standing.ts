import { STANDING_MAX } from "./occupations";

// The craft ladder, and exactly what it takes to climb it.
//
// `OCCUPATIONS.md` §2b decided the ladder exists — CRAFT track only, 1..4,
// never decaying. It did not state the thresholds. These are the thresholds.
// There are no others.
//
// A standing is a credential, not a currency: it cannot be bought, it cannot be
// spent, and it does not decay. It is only ever recomputed downward when the
// evidence under it is withdrawn, or suspended when a report is upheld. No
// billing or Karama code path may write it.

export interface StandingInput {
  /** CONFIRMED WorkProof rows on this occupation. */
  confirmedProofs: number;
  /**
   * Distinct counterparties behind them — a distinct client user OR company.
   * Six proofs from one client is one relationship, and the ladder says so.
   */
  distinctCounterparties: number;
  /** Days between the earliest and latest confirmedAt. */
  spanDays: number;
  /** Vouches from DISTINCT value-4 holders in the same occupation. */
  vouchesFromMasters: number;
  /** A Recommendation authored by a PROFESSIONAL_BODY-verified account. */
  hasBodyRecommendation: boolean;
}

/**
 * Each rung's requirements, ascending.
 *
 * The span requirement is what stops a burst: twenty-five proofs in a fortnight
 * is a busy month or a friend with an account, and 540 days is long enough that
 * the second reading stops being cheap.
 */
export const STANDING_THRESHOLDS = [
  { value: 2, proofs: 3, counterparties: 2, spanDays: 0 },
  { value: 3, proofs: 10, counterparties: 5, spanDays: 180 },
  { value: 4, proofs: 25, counterparties: 12, spanDays: 540 },
] as const;

// STANDING_MIN / STANDING_MAX live in occupations.ts, which owns the ladder's
// bounds. Re-declaring them here would be a second answer to "how many rungs".

/** Two masters, or one professional body. Either, never neither. */
function hasSponsor(i: StandingInput): boolean {
  return i.vouchesFromMasters >= 2 || i.hasBodyRecommendation;
}

/**
 * Returns 1..4. 1 is automatic on an OccupationClaim and renders as
 * «مهنة معلنة» until any evidence exists.
 *
 * Monotone in every input by construction: adding a proof, a counterparty or a
 * day can never lower the result, which is the property that makes "never
 * decays" true rather than aspirational.
 */
export function standingFor(i: StandingInput): 1 | 2 | 3 | 4 {
  let value: 1 | 2 | 3 | 4 = 1;
  for (const t of STANDING_THRESHOLDS) {
    const meets =
      i.confirmedProofs >= t.proofs &&
      i.distinctCounterparties >= t.counterparties &&
      i.spanDays >= t.spanDays;
    if (!meets) break;
    if (t.value === 4 && !hasSponsor(i)) break;
    value = t.value;
  }
  return value;
}

/**
 * A value-4 holder may hold at most 5 active vouches. An upheld dispute against
 * a vouchee drops capacity to 0 for 180 days and FLAGS their active vouches for
 * review — it does not revoke them, which would punish the innocent vouchees.
 */
export const VOUCH_ACTIVE_CAP = 5;
export const VOUCH_SUSPENSION_DAYS = 180;

/**
 * What the next rung still needs, or null at the top.
 *
 * The product tells a member what is missing rather than showing a locked
 * badge: "two more confirmations, from one more client" is something somebody
 * can act on, and a padlock is not.
 */
export interface StandingGap {
  next: 2 | 3 | 4;
  proofsShort: number;
  counterpartiesShort: number;
  daysShort: number;
  needsSponsor: boolean;
}

export function standingGap(i: StandingInput): StandingGap | null {
  const current = standingFor(i);
  if (current === STANDING_MAX) return null;

  const next = STANDING_THRESHOLDS.find((t) => t.value === current + 1);
  if (!next) return null;

  return {
    next: next.value,
    proofsShort: Math.max(0, next.proofs - i.confirmedProofs),
    counterpartiesShort: Math.max(0, next.counterparties - i.distinctCounterparties),
    daysShort: Math.max(0, next.spanDays - i.spanDays),
    needsSponsor: next.value === 4 && !hasSponsor(i),
  };
}

/**
 * Whether a work proof may count at all.
 *
 * A proof whose counterparty is the worker is not evidence, it is a claim
 * wearing evidence's clothes — and it is the first thing anybody tries.
 */
export function isSelfConfirmation(workerId: string, counterpartyUserId: string | null): boolean {
  return counterpartyUserId !== null && workerId === counterpartyUserId;
}
