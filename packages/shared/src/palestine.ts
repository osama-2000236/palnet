// Palestine location + education source of truth.
// Canonical list per docs/localization-palestine.md §Palestinian Context.
// ponytail: plain constants, no DB table/FK — pickers write the canonical Arabic
// city string into the existing free-text columns.
//
// The old ceiling here read "add a `governorate` column only if
// governorate-level filtering is ever needed". It is needed — craft hiring is
// hyper-local (MATCHING.md §3) — and it shipped without the column: the jobs
// facet expands a governorate key into the city names it holds and filters on
// those (`jobs.service.ts` list). A column is still the answer if the planner
// ever needs an index on it, or if a city can belong to a governorate this
// list does not know.

import { foldArabic } from "./arabic-fold";

export interface PsCity {
  /** stable ascii key */
  key: string;
  ar: string;
  en: string;
}

export interface PsGovernorate {
  key: string;
  ar: string;
  en: string;
  cities: PsCity[];
}

const c = (key: string, ar: string, en: string): PsCity => ({ key, ar, en });

export const PS_GOVERNORATES: readonly PsGovernorate[] = [
  {
    key: "jerusalem",
    ar: "القدس",
    en: "Jerusalem",
    cities: [c("jerusalem", "القدس", "Jerusalem")],
  },
  {
    key: "ramallah",
    ar: "رام الله والبيرة",
    en: "Ramallah & Al-Bireh",
    cities: [c("ramallah", "رام الله", "Ramallah")],
  },
  { key: "nablus", ar: "نابلس", en: "Nablus", cities: [c("nablus", "نابلس", "Nablus")] },
  { key: "hebron", ar: "الخليل", en: "Hebron", cities: [c("hebron", "الخليل", "Hebron")] },
  {
    key: "bethlehem",
    ar: "بيت لحم",
    en: "Bethlehem",
    cities: [c("bethlehem", "بيت لحم", "Bethlehem"), c("beit-jala", "بيت جالا", "Beit Jala")],
  },
  { key: "jenin", ar: "جنين", en: "Jenin", cities: [c("jenin", "جنين", "Jenin")] },
  { key: "tulkarm", ar: "طولكرم", en: "Tulkarm", cities: [c("tulkarm", "طولكرم", "Tulkarm")] },
  {
    key: "qalqilya",
    ar: "قلقيلية",
    en: "Qalqilya",
    cities: [c("qalqilya", "قلقيلية", "Qalqilya")],
  },
  { key: "jericho", ar: "أريحا", en: "Jericho", cities: [c("jericho", "أريحا", "Jericho")] },
  { key: "gaza", ar: "غزة", en: "Gaza", cities: [c("gaza", "غزة", "Gaza")] },
  {
    key: "khan-younis",
    ar: "خان يونس",
    en: "Khan Younis",
    cities: [c("khan-younis", "خان يونس", "Khan Younis")],
  },
  { key: "rafah", ar: "رفح", en: "Rafah", cities: [c("rafah", "رفح", "Rafah")] },
  {
    key: "deir-al-balah",
    ar: "دير البلح",
    en: "Deir al-Balah",
    cities: [c("deir-al-balah", "دير البلح", "Deir al-Balah")],
  },
] as const;

export const PS_CITIES: readonly PsCity[] = PS_GOVERNORATES.flatMap((g) => g.cities);

export const PS_UNIVERSITIES: readonly { key: string; ar: string; en: string }[] = [
  { key: "birzeit", ar: "جامعة بيرزيت", en: "Birzeit University" },
  { key: "an-najah", ar: "جامعة النجاح الوطنية", en: "An-Najah National University" },
  { key: "iug", ar: "الجامعة الإسلامية بغزة", en: "Islamic University of Gaza" },
  { key: "al-quds", ar: "جامعة القدس", en: "Al-Quds University" },
  { key: "bethlehem", ar: "جامعة بيت لحم", en: "Bethlehem University" },
  { key: "hebron", ar: "جامعة الخليل", en: "Hebron University" },
  { key: "ppu", ar: "جامعة بوليتكنك فلسطين", en: "Palestine Polytechnic University" },
  { key: "aaup", ar: "الجامعة العربية الأمريكية", en: "Arab American University" },
  { key: "al-azhar-gaza", ar: "جامعة الأزهر - غزة", en: "Al-Azhar University – Gaza" },
  { key: "ptuk", ar: "جامعة فلسطين التقنية - خضوري", en: "Palestine Technical University" },
] as const;

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
// Derived rather than stored — see governorateOfCity below, and the header for
// what closing that ceiling cost.

/**
 * Region matters because travel between them is not possible, so a job in the
 * other one is not a weak match — it is not a match. MATCHING.md §3.
 */
export const PsRegion = {
  WEST_BANK: "WEST_BANK",
  GAZA: "GAZA",
} as const;
export type PsRegion = (typeof PsRegion)[keyof typeof PsRegion];

const GAZA_GOVERNORATES = new Set(["gaza", "khan-younis", "rafah", "deir-al-balah"]);

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
