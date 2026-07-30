// Occupation taxonomy data — the tables only. Behaviour lives in occupations.ts.
//
// Split out because the two together broke the 300-LOC design QA ceiling, and a
// data table and its query layer are the natural seam: this file changes when the
// trade changes, occupations.ts when the rules do.
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

import type {
  PsOccupation,
  PsOccupationFamily,
  PsProfessionalBody,
  StandingLabelSet,
  Track,
} from "./occupations";

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
