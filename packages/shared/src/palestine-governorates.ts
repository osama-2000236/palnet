// The location table — governorates and cities. Behaviour lives in palestine.ts.
//
// Split out for the same reason occupations-data.ts is: the table and its query
// layer are the natural seam, and the two together break the 300-LOC design QA
// ceiling. This file changes when the map does, palestine.ts when the rules do.
//
// The shipped table carried 13 of the 16 official governorates — Salfit, Tubas
// and North Gaza were missing entirely — and 14 cities for 5.56 million
// residents. A member in Salfit could not select their governorate, so
// governorateOfCity() returned null for them and proximityScore() degraded to
// its fallback, silently mis-ranking every job. Source data:
// docs/linkedin-parity-2026-08/spec/palestine-governorates.delta.ts.
//
// Keys are FOREVER — they are written into free-text columns on Profile and
// Job. Additions are safe; renaming one is a data migration. Ordering is
// north-to-south within each region, which is how the market states them and
// how the picker renders.

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
  // ── West Bank (11) ──
  {
    key: "jenin",
    ar: "جنين",
    en: "Jenin",
    cities: [
      c("jenin", "جنين", "Jenin"),
      c("qabatiya", "قباطية", "Qabatiya"),
      c("yabad", "يعبد", "Ya'bad"),
      c("arraba", "عرابة", "Arraba"),
      c("burqin", "برقين", "Burqin"),
      c("silat-al-harithiya", "سيلة الحارثية", "Silat al-Harithiya"),
      c("kafr-dan", "كفر دان", "Kafr Dan"),
      c("jaba-jenin", "جبع", "Jaba'"),
    ],
  },
  {
    key: "tubas",
    ar: "طوباس",
    en: "Tubas",
    cities: [
      c("tubas", "طوباس", "Tubas"),
      c("tammun", "طمون", "Tammun"),
      c("aqqaba", "عقابا", "Aqqaba"),
      c("al-faraa", "الفارعة", "Al-Far'a"),
    ],
  },
  {
    key: "tulkarm",
    ar: "طولكرم",
    en: "Tulkarm",
    cities: [
      c("tulkarm", "طولكرم", "Tulkarm"),
      c("anabta", "عنبتا", "Anabta"),
      c("deir-al-ghusun", "دير الغصون", "Deir al-Ghusun"),
      c("attil", "عتيل", "Attil"),
      c("bala", "بلعا", "Bal'a"),
      c("qaffin", "قفين", "Qaffin"),
    ],
  },
  {
    key: "nablus",
    ar: "نابلس",
    en: "Nablus",
    cities: [
      c("nablus", "نابلس", "Nablus"),
      c("beita", "بيتا", "Beita"),
      c("huwara", "حوارة", "Huwara"),
      c("aqraba", "عقربا", "Aqraba"),
      c("asira-ash-shamaliya", "عصيرة الشمالية", "Asira ash-Shamaliya"),
      c("sebastia", "سبسطية", "Sebastia"),
      c("salim", "سالم", "Salim"),
    ],
  },
  {
    key: "qalqilya",
    ar: "قلقيلية",
    en: "Qalqilya",
    cities: [
      c("qalqilya", "قلقيلية", "Qalqilya"),
      c("azzun", "عزون", "Azzun"),
      c("jayyous", "جيوس", "Jayyous"),
      c("hableh", "حبلة", "Hableh"),
      c("kafr-thulth", "كفر ثلث", "Kafr Thulth"),
    ],
  },
  {
    key: "salfit",
    ar: "سلفيت",
    en: "Salfit",
    cities: [
      c("salfit", "سلفيت", "Salfit"),
      c("biddya", "بديا", "Biddya"),
      c("bruqin", "بروقين", "Bruqin"),
      c("kafr-ad-dik", "كفر الديك", "Kafr ad-Dik"),
      c("deir-istiya", "دير استيا", "Deir Istiya"),
    ],
  },
  {
    key: "ramallah",
    ar: "رام الله والبيرة",
    en: "Ramallah & Al-Bireh",
    cities: [
      c("ramallah", "رام الله", "Ramallah"),
      c("al-bireh", "البيرة", "Al-Bireh"),
      c("beitunia", "بيتونيا", "Beitunia"),
      c("birzeit", "بيرزيت", "Birzeit"),
      c("silwad", "سلواد", "Silwad"),
      c("deir-dibwan", "دير دبوان", "Deir Dibwan"),
      c("nilin", "نعلين", "Ni'lin"),
      c("turmus-ayya", "ترمسعيا", "Turmus Ayya"),
      c("beit-rima", "بيت ريما", "Beit Rima"),
    ],
  },
  {
    key: "jericho",
    ar: "أريحا والأغوار",
    en: "Jericho & Al-Aghwar",
    cities: [
      c("jericho", "أريحا", "Jericho"),
      c("al-auja", "العوجا", "Al-Auja"),
      c("aqbat-jaber", "عقبة جبر", "Aqbat Jaber"),
    ],
  },
  {
    key: "jerusalem",
    ar: "القدس",
    en: "Jerusalem",
    cities: [
      c("jerusalem", "القدس", "Jerusalem"),
      c("abu-dis", "أبو ديس", "Abu Dis"),
      c("al-eizariya", "العيزرية", "Al-Eizariya"),
      c("beit-hanina", "بيت حنينا", "Beit Hanina"),
      c("shufat", "شعفاط", "Shu'fat"),
      c("al-ram", "الرام", "Al-Ram"),
      c("biddu", "بدو", "Biddu"),
      c("qatanna", "قطنة", "Qatanna"),
    ],
  },
  {
    key: "bethlehem",
    ar: "بيت لحم",
    en: "Bethlehem",
    cities: [
      c("bethlehem", "بيت لحم", "Bethlehem"),
      c("beit-jala", "بيت جالا", "Beit Jala"),
      c("beit-sahour", "بيت ساحور", "Beit Sahour"),
      c("ad-doha", "الدوحة", "Ad-Doha"),
      c("al-khader", "الخضر", "Al-Khader"),
      c("tuqu", "تقوع", "Tuqu'"),
      c("battir", "بتير", "Battir"),
    ],
  },
  {
    key: "hebron",
    ar: "الخليل",
    en: "Hebron",
    cities: [
      c("hebron", "الخليل", "Hebron"),
      c("yatta", "يطا", "Yatta"),
      c("dura", "دورا", "Dura"),
      c("halhul", "حلحول", "Halhul"),
      c("bani-naim", "بني نعيم", "Bani Na'im"),
      c("idhna", "إذنا", "Idhna"),
      c("as-samu", "السموع", "As-Samu"),
      c("beit-ummar", "بيت أمر", "Beit Ummar"),
      c("sair", "سعير", "Sa'ir"),
      c("tarqumiya", "ترقوميا", "Tarqumiya"),
      c("ad-dhahiriya", "الظاهرية", "Ad-Dhahiriya"),
    ],
  },

  // ── Gaza (5) ──
  {
    key: "north-gaza",
    ar: "شمال غزة",
    en: "North Gaza",
    cities: [
      c("jabalia", "جباليا", "Jabalia"),
      c("beit-lahia", "بيت لاهيا", "Beit Lahia"),
      c("beit-hanoun", "بيت حانون", "Beit Hanoun"),
      c("umm-an-nasr", "أم النصر", "Umm an-Nasr"),
    ],
  },
  {
    key: "gaza",
    ar: "غزة",
    en: "Gaza",
    cities: [
      c("gaza", "غزة", "Gaza"),
      c("az-zahra", "الزهراء", "Az-Zahra"),
      c("al-mughraqa", "المغراقة", "Al-Mughraqa"),
    ],
  },
  {
    key: "deir-al-balah",
    ar: "دير البلح",
    en: "Deir al-Balah",
    cities: [
      c("deir-al-balah", "دير البلح", "Deir al-Balah"),
      c("nuseirat", "النصيرات", "Nuseirat"),
      c("bureij", "البريج", "Bureij"),
      c("maghazi", "المغازي", "Maghazi"),
      c("az-zawayda", "الزوايدة", "Az-Zawayda"),
    ],
  },
  {
    key: "khan-younis",
    ar: "خان يونس",
    en: "Khan Younis",
    cities: [
      c("khan-younis", "خان يونس", "Khan Younis"),
      c("bani-suheila", "بني سهيلا", "Bani Suheila"),
      c("abasan-al-kabira", "عبسان الكبيرة", "Abasan al-Kabira"),
      c("khuzaa", "خزاعة", "Khuza'a"),
      c("al-qarara", "القرارة", "Al-Qarara"),
    ],
  },
  {
    key: "rafah",
    ar: "رفح",
    en: "Rafah",
    cities: [
      c("rafah", "رفح", "Rafah"),
      c("shokat-as-sufi", "شوكة الصوفي", "Shokat as-Sufi"),
      c("an-naser", "النصر", "An-Naser"),
    ],
  },
];

/** Travel between the two regions is not possible, so region is not a weak
 * signal — it is a hard one. See regionOfGovernorate in palestine.ts. */
export const GAZA_GOVERNORATE_KEYS: readonly string[] = [
  "north-gaza",
  "gaza",
  "deir-al-balah",
  "khan-younis",
  "rafah",
];
