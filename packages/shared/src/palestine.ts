// Palestine location + education source of truth — the query layer.
// Canonical list per docs/localization-palestine.md §Palestinian Context.
//
// The tables themselves live in palestine-governorates.ts and
// palestine-universities.ts; this file holds the functions that read them.
//
// ponytail: plain constants, no DB table/FK — pickers write the canonical Arabic
// city string into the existing free-text columns. Add a `governorate` column
// only if governorate-level filtering is ever needed.

import { foldArabic } from "./arabic-fold";
import { GAZA_GOVERNORATE_KEYS, PS_GOVERNORATES } from "./palestine-governorates";
import type { PsCity, PsGovernorate } from "./palestine-governorates";

export { PS_GOVERNORATES };
export type { PsCity, PsGovernorate };
export { PS_UNIVERSITIES } from "./palestine-universities";
export type { PsUniversity } from "./palestine-universities";

export const PS_CITIES: readonly PsCity[] = PS_GOVERNORATES.flatMap((g) => g.cities);

// Job-market sectors, NGO/international organizations first — they are the
// largest formal employers in the Palestinian market (jobs.ps lists NGO jobs
// as its headline category). Free text stays allowed everywhere; these are
// canonical suggestion/filter values, Arabic as the stored form.
export const PS_INDUSTRIES: readonly { key: string; ar: string; en: string }[] = [
  { key: "ngo", ar: "منظمات أهلية وغير حكومية", en: "NGOs & Civil Society" },
  { key: "intl-org", ar: "منظمات دولية وأممية", en: "International & UN Organizations" },
  { key: "tech", ar: "التكنولوجيا والبرمجيات", en: "Technology & Software" },
  { key: "education", ar: "التعليم والتدريب", en: "Education & Training" },
  { key: "health", ar: "الصحة والرعاية الطبية", en: "Healthcare & Medical" },
  { key: "finance", ar: "البنوك والتمويل", en: "Banking & Finance" },
  { key: "engineering", ar: "الهندسة والإنشاءات", en: "Engineering & Construction" },
  { key: "agriculture", ar: "الزراعة", en: "Agriculture" },
  { key: "media", ar: "الإعلام والتصميم", en: "Media & Design" },
  { key: "trade", ar: "التجارة والبيع", en: "Commerce & Retail" },
  { key: "tourism", ar: "السياحة والضيافة", en: "Tourism & Hospitality" },
  { key: "government", ar: "القطاع الحكومي", en: "Government & Public Sector" },
  { key: "telecom", ar: "الاتصالات", en: "Telecommunications" },
  { key: "logistics", ar: "النقل والخدمات اللوجستية", en: "Transport & Logistics" },
  { key: "legal", ar: "القانون", en: "Legal" },
  { key: "manufacturing", ar: "الصناعة والتصنيع", en: "Manufacturing" },
] as const;

/**
 * Canonicalize a city input: known Palestinian cities (Arabic or English,
 * case/whitespace-insensitive) map to their canonical Arabic name — the value
 * stored and filtered on. Unknown input (diaspora cities) passes through trimmed.
 */
export function normalizeCity(input: string): string {
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  const lower = cleaned.toLowerCase();
  // Fold Arabic orthography so قلقيليه / رام اللة variants still canonicalize.
  const folded = foldArabic(cleaned);
  const hit = PS_CITIES.find(
    (city) => foldArabic(city.ar) === folded || city.en.toLowerCase() === lower,
  );
  return hit ? hit.ar : cleaned;
}

// ── Governorate + region ───────────────────────────────────────────────────
// This closes the header's "add a governorate column only if governorate-level
// filtering is ever needed": craft hiring is hyper-local, so it is needed. Still
// derived rather than stored — see governorateOfCity below.

/**
 * Region matters because travel between them is not possible, so a job in the
 * other one is not a weak match — it is not a match. MATCHING.md §3.
 */
export const PsRegion = {
  WEST_BANK: "WEST_BANK",
  GAZA: "GAZA",
} as const;
export type PsRegion = (typeof PsRegion)[keyof typeof PsRegion];

const GAZA_GOVERNORATES = new Set(GAZA_GOVERNORATE_KEYS);

const GOVERNORATE_BY_FOLDED_CITY = (() => {
  const index = new Map<string, string>();
  for (const gov of PS_GOVERNORATES) {
    for (const city of gov.cities) {
      index.set(foldArabic(city.ar), gov.key);
      index.set(city.en.toLowerCase(), gov.key);
      index.set(city.key, gov.key);
    }
  }
  return index;
})();

/**
 * Governorate key for a city string, or null for diaspora / free-text cities.
 * Derived from PS_GOVERNORATES rather than stored, and a free-text city must
 * degrade to "no governorate" rather than to a wrong one.
 *
 * ponytail: derive-on-read; add Profile.governorate only if the query planner
 * needs an index on it.
 */
export function governorateOfCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const cleaned = city.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  return (
    GOVERNORATE_BY_FOLDED_CITY.get(foldArabic(cleaned)) ??
    GOVERNORATE_BY_FOLDED_CITY.get(cleaned.toLowerCase()) ??
    null
  );
}

export function regionOfGovernorate(governorateKey: string | null): PsRegion | null {
  if (!governorateKey) return null;
  if (!PS_GOVERNORATES.some((g) => g.key === governorateKey)) return null;
  return GAZA_GOVERNORATES.has(governorateKey) ? PsRegion.GAZA : PsRegion.WEST_BANK;
}

/**
 * Proximity score in [0,1] for matching and feed ranking. Unknown location is
 * 0.3 — neutral-ish, because a diaspora member applying remotely is plausible
 * while a wrong-region match is not.
 */
export function proximityScore(
  cityA: string | null | undefined,
  cityB: string | null | undefined,
): number {
  const govA = governorateOfCity(cityA);
  const govB = governorateOfCity(cityB);
  if (!govA || !govB) return 0.3;
  if (govA === govB) return 1;
  const regionA = regionOfGovernorate(govA);
  const regionB = regionOfGovernorate(govB);
  if (regionA !== regionB) return 0;
  return 0.6;
}
