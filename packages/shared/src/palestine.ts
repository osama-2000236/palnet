// Palestine location + education source of truth.
// Canonical list per docs/localization-palestine.md §Palestinian Context.
// ponytail: plain constants, no DB table/FK — pickers write the canonical Arabic
// city string into the existing free-text columns. Add a `governorate` column
// only if governorate-level filtering is ever needed.

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
