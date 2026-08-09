// Occupation taxonomy — the join key for standing, matching, and feed topics.
//
// Decisions and their sources: docs/design/OCCUPATIONS.md. Every Arabic label
// here was checked against التصنيف الأردني المعياري للمهن 2021 (sajjil.gov.jo/soc,
// 2,993 ISCO-aligned occupations); the traps that verification caught are in
// §4 of that doc, and the reason أسطى / صنايعي / فني أول appear only as input
// synonyms is that all three have zero occurrences in it.
//
// ponytail: plain constants, no DB table — same reasoning as PS_CITIES in
// palestine.ts. A DB table buys referential integrity over a list that changes
// once a year and costs a migration every time a family is added.
//
// PROVISIONAL KEYS: the family set still owes one conversation with someone in
// the trade (OCCUPATIONS.md §6 item 5). Adding a family or an occupation later
// is additive and safe; RENAMING a key is a data migration, so treat the keys
// below as append-only until that conversation happens.

import { foldArabic } from "./arabic-fold";

import { PS_OCCUPATION_FAMILIES, PS_OCCUPATIONS, PS_PROFESSIONAL_BODIES } from "./occupations-data";

// Re-exported so consumers keep importing the taxonomy from one place.
export { PS_OCCUPATION_FAMILIES, PS_OCCUPATIONS, PS_PROFESSIONAL_BODIES };

/**
 * How progression works for a family. One evidence primitive (WorkProof),
 * three ways of summarising it — OCCUPATIONS.md §2.
 *
 * - CRAFT    peer-earned Standing 1–4.
 * - LICENSED no Baydar rank at all; a verified Licence from a نقابة or مجلس.
 * - SERVICE  no rank; WorkProof count and rating only.
 */
export const Track = {
  CRAFT: "CRAFT",
  LICENSED: "LICENSED",
  SERVICE: "SERVICE",
} as const;
export type Track = (typeof Track)[keyof typeof Track];

/**
 * Which set of Standing labels a CRAFT family uses. A painter's rung 3 is
 * «دهّان ماهر»; an electrician's is «فني تمديدات كهربائية». Swapping them reads
 * as a demotion in both directions, so the label set is per family — and it is
 * data, not code: these resolve to i18n keys so the register reviewer can swap
 * the whole ladder with a JSON edit.
 */
export const StandingLabelSet = {
  DEFAULT: "default",
  TECHNICAL: "technical",
} as const;
export type StandingLabelSet = (typeof StandingLabelSet)[keyof typeof StandingLabelSet];

export const STANDING_MIN = 1;
export const STANDING_MAX = 4;

export interface PsOccupationFamily {
  key: string;
  ar: string;
  en: string;
  track: Track;
  /** ISCO-08 major/sub-major group(s). Group names verified in OCCUPATIONS.md §4. */
  isco: string;
  /** CRAFT families only — which Standing label set applies. */
  standingLabels?: StandingLabelSet;
}

export interface PsOccupation {
  key: string;
  /** Canonical Arabic, official form where the classification has one. Stored value. */
  ar: string;
  en: string;
  family: string;
  /**
   * Colloquial or alternate spellings accepted on input and in search. Never
   * stored, never displayed — سبّاك resolves to تمديدات صحية because the
   * classification's سباكة means metal casting.
   */
  synonyms?: readonly string[];
}

/**
 * Statutory licensing bodies. Verified 2026-07-30 — OCCUPATIONS.md §1b.
 * `families` lists which occupation families this body licenses.
 */
export interface PsProfessionalBody {
  key: string;
  ar: string;
  en: string;
  site: string;
  families: readonly string[];
}

/**
 * Practice status, in the professions' own vocabulary — the bar association's
 * portal serves «المحامين المزاولين والمتدربين» and PACPA splits its members
 * into مزاولين وغير مزاولين. Nothing invented here.
 */
export const PracticeStatus = {
  TRAINEE: "TRAINEE",
  PRACTISING: "PRACTISING",
  NON_PRACTISING: "NON_PRACTISING",
} as const;
export type PracticeStatus = (typeof PracticeStatus)[keyof typeof PracticeStatus];

/** Whether a licence has been checked against the issuing body. */
export const LicenceStatus = {
  DECLARED: "DECLARED",
  VERIFIED: "VERIFIED",
  EXPIRED: "EXPIRED",
} as const;
export type LicenceStatus = (typeof LicenceStatus)[keyof typeof LicenceStatus];

// ── Lookups ────────────────────────────────────────────────────────────────

const FAMILY_BY_KEY = new Map(PS_OCCUPATION_FAMILIES.map((x) => [x.key, x]));
const OCCUPATION_BY_KEY = new Map(PS_OCCUPATIONS.map((x) => [x.key, x]));

/** Folded Arabic / lowered English → occupation key. Built once. */
const OCCUPATION_INDEX = (() => {
  const index = new Map<string, string>();
  for (const occ of PS_OCCUPATIONS) {
    index.set(foldArabic(occ.ar), occ.key);
    index.set(occ.en.toLowerCase(), occ.key);
    for (const syn of occ.synonyms ?? []) index.set(foldArabic(syn), occ.key);
  }
  return index;
})();

export function occupationByKey(key: string): PsOccupation | undefined {
  return OCCUPATION_BY_KEY.get(key);
}

/**
 * The family an occupation belongs to, or null when the key is unknown.
 *
 * "Same field" is the second-strongest suggestion signal after shared
 * connections, and comparing occupation keys directly is too narrow: a
 * كهربائي مباني and a كهربائي سيارات are peers, and their keys are not equal.
 */
export function occupationFamilyOf(occupationKey: string): string | null {
  return OCCUPATION_BY_KEY.get(occupationKey)?.family ?? null;
}

/** The track that governs an occupation's progression, or undefined if unknown. */
export function trackOf(occupationKey: string): Track | undefined {
  const occ = OCCUPATION_BY_KEY.get(occupationKey);
  return occ ? FAMILY_BY_KEY.get(occ.family)?.track : undefined;
}

/** True when this occupation earns a peer Standing at all. */
export function hasStanding(occupationKey: string): boolean {
  return trackOf(occupationKey) === Track.CRAFT;
}

/**
 * Resolve free text to an occupation key. Accepts canonical Arabic, English,
 * and the colloquial synonyms — folded, so "كهربائى" and "كهربائي" agree.
 * Returns null for anything unrecognised; callers keep free text as-is rather
 * than guessing.
 */
export function normalizeOccupation(input: string): string | null {
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  return (
    OCCUPATION_INDEX.get(foldArabic(cleaned)) ?? OCCUPATION_INDEX.get(cleaned.toLowerCase()) ?? null
  );
}

/**
 * i18n key for a Standing label. The Arabic lives in the message catalogs so
 * the register reviewer can swap the whole ladder without touching code — the
 * value is a template taking `{occupation}`, e.g. "مساعد {occupation}".
 *
 * Returns null when the occupation has no ladder (LICENSED / SERVICE): callers
 * must render a licence or raw evidence instead, never a fabricated rung.
 */
export function standingLabelKey(
  occupationKey: string,
  standing: number,
  gender: "masc" | "fem" = "masc",
): string | null {
  if (!Number.isInteger(standing) || standing < STANDING_MIN || standing > STANDING_MAX)
    return null;
  const occ = OCCUPATION_BY_KEY.get(occupationKey);
  if (!occ) return null;
  const family = FAMILY_BY_KEY.get(occ.family);
  if (!family || family.track !== Track.CRAFT) return null;
  const set = family.standingLabels ?? StandingLabelSet.DEFAULT;
  return `occupations.standing.${set}.${standing}.${gender}`;
}
