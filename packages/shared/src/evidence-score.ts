import { z } from "zod";

// Why should I believe this person.
//
// In a market where roughly 41% of graduates are unemployed and every CV says
// the same things, self-reported history has almost no discriminating power.
// Three things do discriminate: a statutory licence somebody else issued,
// finished work a counterparty confirmed, and a named person putting their own
// reputation behind you.
//
// This is those three, weighted, as one integer 0-100. Cached on
// `Profile.evidenceScore`, recomputed ON WRITE only, never on read.
//
// WHERE IT MAY BE USED: ordering a candidate list an employer has already
// opened. Nowhere else — never the feed, never public search. Rule 1 (§4.2):
// no term is money, and `check-ranking-purity.mjs` scans this file to keep it
// that way.

/**
 * Everything a profile has been able to show, and the shape the
 * `/profiles/:handle/evidence` endpoint returns.
 *
 * The score is computed from this and nothing else, which is what makes "no
 * paid input" a property of the type rather than a promise in a comment.
 */
export const EvidenceSummary = z.object({
  confirmedWorkProofs: z.number().int().min(0),
  distinctCounterparties: z.number().int().min(0),
  standing: z
    .object({ occupationKey: z.string(), value: z.number().int().min(1).max(4) })
    .nullable(),
  licence: z
    .object({
      bodyKey: z.string(),
      status: z.enum(["DECLARED", "VERIFIED", "EXPIRED"]),
      practice: z.enum(["TRAINEE", "PRACTISING", "NON_PRACTISING"]),
    })
    .nullable(),
  recommendations: z.number().int().min(0),
  verifications: z.array(z.enum(["PHONE", "WORK_EMAIL", "EDU_EMAIL", "PROFESSIONAL_BODY"])),
  /**
   * Null below `SAFETY.MIN_RATINGS_FOR_AVERAGE` — §16.5. A single retaliatory
   * one-star must not be allowed to define somebody. Displayed, never scored:
   * a rating is somebody's opinion, and the score is only for things that
   * happened.
   */
  ratingAvg: z.number().min(1).max(5).nullable(),
  ratingCount: z.number().int().min(0),
});
export type EvidenceSummary = z.infer<typeof EvidenceSummary>;

/**
 * Six terms, and what each is worth out of 100.
 *
 * Confirmed work is the heaviest because it is the only term somebody else had
 * to act for. Counterparties is a separate term from proof count on purpose:
 * six proofs from one client is one relationship, not six.
 */
export function evidenceScore(s: EvidenceSummary): number {
  const proofs = 30 * (Math.min(s.confirmedWorkProofs, 6) / 6);
  const parties = 20 * (Math.min(s.distinctCounterparties, 4) / 4);
  const standing = 15 * (s.standing ? s.standing.value / 4 : 0);
  // An unverified licence is worth 0.3 of a verified one. Not zero: declaring
  // one is a checkable claim against a نقابة register, and an expired one still
  // says a body issued it once. Not one: Baydar has not checked it, and saying
  // otherwise is the thing `check-naming` bans the word معتمد for. DECLARED and
  // EXPIRED price the same here; `EvidenceSummary.licence.status` is what the
  // UI renders, and it never renders an expired licence as current.
  const licence = 15 * (s.licence?.status === "VERIFIED" ? 1 : s.licence ? 0.3 : 0);
  const recs = 10 * (Math.min(s.recommendations, 3) / 3);
  const verif = 10 * (s.verifications.length / 4);
  return Math.min(100, Math.round(proofs + parties + standing + licence + recs + verif));
}

/**
 * What a profile that has shown nothing scores.
 *
 * Zero, and that is the honest answer. The product's job is to make the first
 * proof easy, not to pad the number.
 */
export const EMPTY_EVIDENCE: EvidenceSummary = {
  confirmedWorkProofs: 0,
  distinctCounterparties: 0,
  standing: null,
  licence: null,
  recommendations: 0,
  verifications: [],
  ratingAvg: null,
  ratingCount: 0,
};
