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
import { PS_GOVERNORATES } from "./palestine";

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

const f = (
  key: string,
  ar: string,
  en: string,
  track: Track,
  isco: string,
  standingLabels?: StandingLabelSet,
): PsOccupationFamily => ({ key, ar, en, track, isco, standingLabels });

export const PS_OCCUPATION_FAMILIES: readonly PsOccupationFamily[] = [
  // ── CRAFT ────────────────────────────────────────────────────────────────
  f("construction", "البناء والإنشاءات", "Construction", "CRAFT", "711", "default"),
  f("stone-marble", "الحجر والرخام", "Stone & Marble", "CRAFT", "711", "default"),
  f("electrical", "الكهرباء", "Electrical", "CRAFT", "741", "technical"),
  f("plumbing", "الأدوات الصحية والتدفئة", "Plumbing & Heating", "CRAFT", "712", "default"),
  f("hvac", "التكييف والتبريد", "HVAC & Refrigeration", "CRAFT", "713", "technical"),
  f("carpentry", "النجارة", "Carpentry", "CRAFT", "752", "default"),
  f("aluminium", "الألمنيوم والزجاج", "Aluminium & Glass", "CRAFT", "721", "default"),
  f("metalwork", "الحدادة واللحام", "Metalwork & Welding", "CRAFT", "721", "technical"),
  f("finishing", "الدهان والتشطيبات", "Painting & Finishing", "CRAFT", "713", "default"),
  f("tiling", "البلاط والسيراميك", "Tiling", "CRAFT", "712", "default"),
  f("vehicles", "ميكانيك المركبات", "Vehicle Mechanics", "CRAFT", "723", "default"),
  f(
    "electronics",
    "الإلكترونيات والأجهزة",
    "Electronics & Appliances",
    "CRAFT",
    "742",
    "technical",
  ),
  f("food", "الطعام والمخابز والحلويات", "Food, Bakery & Sweets", "CRAFT", "751", "default"),
  f("home-food", "الصناعات الغذائية المنزلية", "Home Food Production", "CRAFT", "751", "default"),
  f("textile", "الخياطة والتطريز", "Tailoring & Embroidery", "CRAFT", "753", "default"),
  f("heritage", "الحرف التراثية", "Heritage Crafts", "CRAFT", "731", "default"),
  f("beauty", "الحلاقة والتجميل", "Barbering & Beauty", "CRAFT", "514", "default"),
  f("agriculture", "الزراعة والحصاد", "Agriculture & Harvest", "CRAFT", "611", "default"),

  // ── LICENSED ─────────────────────────────────────────────────────────────
  // No Standing. A نقابة or a مجلس already decides who may practise, and a
  // Baydar rank beside a statutory licence is noise at best.
  f("accounting", "المحاسبة والتدقيق", "Accounting & Audit", "LICENSED", "241"),
  f("legal", "القانون", "Legal", "LICENSED", "261"),
  f("engineering", "الهندسة", "Engineering", "LICENSED", "214"),
  f("medicine", "الطب والصحة", "Medicine & Health", "LICENSED", "221"),
  f("pharmacy", "الصيدلة", "Pharmacy", "LICENSED", "226"),
  f("nursing", "التمريض", "Nursing", "LICENSED", "222"),
  f("surveying", "المساحة", "Surveying", "LICENSED", "216"),

  // ── SERVICE ──────────────────────────────────────────────────────────────
  // No apprenticeship structure to model, or no body that defines one. Four
  // rungs here would be a game mechanic in a qualification's clothes.
  f("logistics", "النقل والتوصيل", "Transport & Delivery", "SERVICE", "832"),
  f("cleaning", "التنظيف والصيانة العامة", "Cleaning & Facilities", "SERVICE", "911"),
  f("retail", "البيع بالتجزئة", "Retail", "SERVICE", "522"),
  f("office", "الأعمال المكتبية والإدارية", "Office & Administration", "SERVICE", "411"),
  f("tech", "التكنولوجيا والبرمجيات", "Technology & Software", "SERVICE", "251"),
  f("design-media", "التصميم والإعلام", "Design & Media", "SERVICE", "216"),
  f("education", "التعليم والتدريب", "Education & Training", "SERVICE", "232"),
] as const;

const o = (
  key: string,
  ar: string,
  en: string,
  family: string,
  synonyms?: readonly string[],
): PsOccupation => ({ key, ar, en, family, synonyms });

export const PS_OCCUPATIONS: readonly PsOccupation[] = [
  // construction
  o("builder", "بنّاء", "Builder", "construction"),
  o("formwork-carpenter", "نجّار طوبار", "Formwork Carpenter", "construction", ["طوبار"]),
  o("rebar-worker", "حداد تسليح أبنية", "Rebar Worker", "construction", ["حداد باطون"]),
  o("construction-worker", "عامل بناء", "Construction Worker", "construction"),
  // stone-marble
  o("stone-mason", "بناء حجر", "Stone Mason", "stone-marble"),
  o("stone-carver", "نقاش حجر بناء", "Stone Carver", "stone-marble", ["نقاش حجر"]),
  o("stone-pointer", "مكحل حجر", "Stone Pointer", "stone-marble"),
  o("stone-floor-layer", "راصف أرضيات حجر", "Stone Floor Layer", "stone-marble"),
  o("marble-fitter", "بليط رخام", "Marble Fitter", "stone-marble", ["تركيب رخام"]),
  // electrical
  o("building-electrician", "كهربائي مباني", "Building Electrician", "electrical", ["كهربائي"]),
  o("industrial-electrician", "كهربائي صناعي", "Industrial Electrician", "electrical"),
  o("electrical-fitter", "فني تمديدات كهربائية", "Electrical Fitter", "electrical", ["تمديدات"]),
  o("solar-technician", "فني طاقة شمسية", "Solar Technician", "electrical", ["طاقة شمسية"]),
  // plumbing — the classification's سباكة means metal casting; plumbing is تمديدات صحية
  o("sanitary-fitter", "فني تمديدات صحية", "Sanitary Fitter", "plumbing", ["سبّاك", "سباك"]),
  o("central-heating-fitter", "ميكانيكي تدفئة مركزية", "Heating Fitter", "plumbing", ["تدفئة"]),
  o("water-heater-fitter", "مركب سخانات", "Water Heater Fitter", "plumbing"),
  // hvac
  o("ac-technician", "فني تكييف", "AC Technician", "hvac", ["مكيفات", "تكييف"]),
  o("refrigeration-technician", "فني تبريد", "Refrigeration Technician", "hvac", ["تبريد"]),
  // carpentry
  o("furniture-carpenter", "نجار أثاث", "Furniture Carpenter", "carpentry", ["نجار موبيليا"]),
  o("decor-carpenter", "نجار زخرفي", "Decorative Carpenter", "carpentry", ["نجار ديكور"]),
  o("building-carpenter", "نجار مباني", "Building Carpenter", "carpentry"),
  // aluminium — officially a metal trade: حداد / المنيوم
  o("aluminium-smith", "حداد ألمنيوم", "Aluminium Smith", "aluminium", ["نجار ألمنيوم", "المنيوم"]),
  o("glazier", "مركب زجاج ومرايا", "Glazier", "aluminium", ["تركيب زجاج"]),
  // metalwork
  o("blacksmith", "حداد إنشاءات معدنية", "Structural Blacksmith", "metalwork", ["حداد"]),
  o("welder", "لحّام", "Welder", "metalwork", ["لحام"]),
  o("sheet-metal-worker", "حداد صاج معدني", "Sheet Metal Worker", "metalwork"),
  o("lathe-operator", "خرّاط", "Lathe Operator", "metalwork", ["خراطة"]),
  // finishing
  o("building-painter", "دهان مباني", "Building Painter", "finishing", ["دهّان", "دهان"]),
  o("gypsum-worker", "دهان مشغولات جبسية", "Gypsum Worker", "finishing", ["جبس"]),
  o("insulation-fitter", "فني عزل مباني", "Insulation Fitter", "finishing", ["عزل"]),
  // tiling
  o("tiler", "عامل بلاط", "Tiler", "tiling", ["بلّاط", "مبلّط", "بلاط"]),
  o("ceramic-fitter", "مركب سيراميك", "Ceramic Fitter", "tiling", ["سيراميك"]),
  o("parquet-fitter", "مركب باركيه", "Parquet Fitter", "tiling", ["باركيه"]),
  // vehicles
  o("vehicle-mechanic", "ميكانيكي مركبات", "Vehicle Mechanic", "vehicles", ["ميكانيكي"]),
  o("auto-electrician", "كهربائي سيارات", "Auto Electrician", "vehicles"),
  o("panel-beater", "سمكري", "Panel Beater", "vehicles", ["سمكرة"]),
  o("vehicle-painter", "دهان مركبات", "Vehicle Painter", "vehicles"),
  o("tyre-fitter", "مركب إطارات", "Tyre Fitter", "vehicles", ["بنشر"]),
  // electronics
  o("phone-repair", "فني صيانة هواتف", "Phone Repair Technician", "electronics", ["صيانة هواتف"]),
  o("appliance-repair", "فني صيانة أجهزة منزلية", "Appliance Technician", "electronics"),
  o("computer-technician", "فني حاسوب", "Computer Technician", "electronics"),
  // food
  o("cook", "طاهٍ", "Cook", "food", ["طاهي", "طباخ"]),
  o("tanoor-baker", "خباز تنور", "Tanoor Baker", "food", ["خباز"]),
  o("saj-baker", "خباز صاج", "Saj Baker", "food"),
  o("pastry-maker", "حلواني", "Pastry Maker", "food", ["حلويات"]),
  o("shawarma-cook", "طاهٍ شاورما", "Shawarma Cook", "food", ["شاورما"]),
  // home-food
  o("preserves-maker", "منتج مونة منزلية", "Preserves Maker", "home-food", ["مونة", "مؤونة"]),
  o("dairy-maker", "منتج ألبان", "Dairy Maker", "home-food", ["ألبان"]),
  // textile
  o("tailor", "خيّاط", "Tailor", "textile", ["خياط"]),
  o("folk-tailor", "خياط شعبي", "Folk Tailor", "textile"),
  o("embroiderer", "مطرز يدوي", "Hand Embroiderer", "textile", ["تطريز", "مطرزة"]),
  o("upholsterer", "عامل تنجيد", "Upholsterer", "textile", ["تنجيد"]),
  // heritage
  o("soap-maker", "صانع صابون نابلسي", "Nabulsi Soap Maker", "heritage", ["صابون نابلسي"]),
  o("potter", "خزّاف", "Potter", "heritage", ["خزف", "فخار"]),
  o("glass-blower", "نافخ زجاج", "Glass Blower", "heritage"),
  o("olive-wood-carver", "نحّات خشب الزيتون", "Olive Wood Carver", "heritage"),
  // beauty
  o("barber", "حلاق", "Barber", "beauty"),
  o("beautician", "أخصائي تجميل", "Beautician", "beauty", ["تجميل"]),
  // agriculture
  o("olive-picker", "عامل قطف زيتون", "Olive Picker", "agriculture", ["قطف الزيتون", "زيتون"]),
  o("pruner", "عامل تقليم", "Pruner", "agriculture", ["تقليم", "تشحيل"]),
  o("greenhouse-worker", "عامل دفيئات", "Greenhouse Worker", "agriculture", ["دفيئات"]),

  // ── LICENSED ─────────────────────────────────────────────────────────────
  o("certified-accountant", "محاسب قانوني", "Certified Accountant", "accounting"),
  o("auditor", "مدقق حسابات", "Auditor", "accounting", ["مراجع حسابات", "مدقق"]),
  o("general-accountant", "محاسب عام", "General Accountant", "accounting", ["محاسب"]),
  o("cost-accountant", "محاسب تكاليف", "Cost Accountant", "accounting"),
  o("payroll-accountant", "محاسب رواتب وأجور", "Payroll Accountant", "accounting"),
  o("corporate-accountant", "محاسب شركات", "Corporate Accountant", "accounting"),
  o("tax-advisor", "مستشار ضريبي", "Tax Advisor", "accounting"),
  o("financial-advisor", "مستشار مالي", "Financial Advisor", "accounting"),
  o("lawyer", "محامي نظامي", "Lawyer", "legal", ["محامي", "محام"]),
  o("sharia-lawyer", "محامي شرعي", "Sharia Lawyer", "legal"),
  o("legal-advisor", "مستشار قانوني", "Legal Advisor", "legal"),
  o("sworn-translator", "مترجم محلف", "Sworn Translator", "legal"),
  o("civil-engineer", "مهندس مدني", "Civil Engineer", "engineering"),
  o("architect", "مهندس معماري", "Architect", "engineering"),
  o("electrical-engineer", "مهندس كهربائي", "Electrical Engineer", "engineering"),
  o("mechanical-engineer", "مهندس ميكانيكي", "Mechanical Engineer", "engineering"),
  o("physician", "طبيب", "Physician", "medicine"),
  o("dentist", "طبيب أسنان", "Dentist", "medicine"),
  o("lab-technician", "فني مختبر طبي", "Medical Lab Technician", "medicine"),
  o("dietitian", "أخصائي تغذية", "Dietitian", "medicine"),
  o("pharmacist", "صيدلي", "Pharmacist", "pharmacy"),
  o("nurse", "ممرض", "Nurse", "nursing"),
  o("surveyor", "مهندس مساحة", "Surveyor", "surveying", ["مساح"]),

  // ── SERVICE ──────────────────────────────────────────────────────────────
  o("driver", "سائق", "Driver", "logistics"),
  o("delivery-worker", "عامل توصيل", "Delivery Worker", "logistics", ["توصيل"]),
  o("mover", "عامل نقل أثاث", "Mover", "logistics"),
  o("house-cleaner", "عامل تنظيف منازل", "House Cleaner", "cleaning", ["تنظيف"]),
  o("facilities-worker", "عامل صيانة عامة", "Facilities Worker", "cleaning"),
  o("salesperson", "بائع", "Salesperson", "retail"),
  o("cashier", "أمين صندوق", "Cashier", "retail", ["كاشير"]),
  o("real-estate-broker", "وسيط عقاري", "Real Estate Broker", "retail"),
  o("admin-assistant", "مساعد إداري", "Administrative Assistant", "office"),
  o("hr-specialist", "أخصائي موارد بشرية", "HR Specialist", "office"),
  // Spelled out, not `pr-specialist`: the RTL lint rule matches `\bpr-` anywhere in a string
  // literal to catch Tailwind's padding-right, and it cannot tell a taxonomy key from a class.
  // Widening that rule to allow this one key would blunt a gate CLAUDE.md calls non-negotiable.
  o("public-relations-specialist", "أخصائي علاقات عامة", "PR Specialist", "office"),
  o("software-developer", "مبرمج تطبيقات", "Software Developer", "tech", ["مبرمج", "مطور"]),
  o("database-developer", "مبرمج قاعدة بيانات", "Database Developer", "tech"),
  o("graphic-designer", "مصمم جرافيك", "Graphic Designer", "design-media", ["مصمم"]),
  o("multimedia-designer", "مصمم وسائط متعددة", "Multimedia Designer", "design-media"),
  o("translator", "مترجم", "Translator", "design-media"),
  o("vocational-trainer", "مدرب مهني", "Vocational Trainer", "education"),
  o("teacher", "معلم", "Teacher", "education"),
] as const;

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

export const PS_PROFESSIONAL_BODIES: readonly PsProfessionalBody[] = [
  {
    key: "bopa",
    ar: "مجلس مهنة تدقيق الحسابات",
    en: "Board of the Audit Profession",
    site: "bopa.ps",
    families: ["accounting"],
  },
  {
    key: "pacpa",
    ar: "جمعية مدققي الحسابات القانونيين الفلسطينية",
    en: "Palestinian Association of Certified Public Accountants",
    site: "pacpa.ps",
    families: ["accounting"],
  },
  {
    key: "pba",
    ar: "نقابة المحامين الفلسطينيين",
    en: "Palestinian Bar Association",
    site: "pbaps.ps",
    families: ["legal"],
  },
  {
    key: "paleng",
    ar: "نقابة المهندسين",
    en: "Association of Engineers",
    site: "paleng.org",
    families: ["engineering", "surveying"],
  },
] as const;

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

export function familyByKey(key: string): PsOccupationFamily | undefined {
  return FAMILY_BY_KEY.get(key);
}

export function occupationByKey(key: string): PsOccupation | undefined {
  return OCCUPATION_BY_KEY.get(key);
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

// ── Geography ──────────────────────────────────────────────────────────────

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
 * Derived from PS_GOVERNORATES rather than stored — palestine.ts's own note
 * said to add a column only if governorate filtering was ever needed, and
 * deriving is still cheaper than a column plus a backfill.
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
