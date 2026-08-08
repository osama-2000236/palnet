// Palestinian higher-education and vocational institutions.
//
// `domain` is what makes EDU_EMAIL verification buildable: without it the
// verification service has nothing to match an address against. It is the bare
// registrable domain — lowercase, no scheme, no `www`. Match it on a dot
// boundary, never as a substring, or `notnajah.edu` passes as `najah.edu`.
//
// `domain: null` is a legitimate value, not a TODO: that institution has no
// EDU_EMAIL path and the member falls back to phone or work-email verification.
//
// OWNER-INPUT: these domains are recorded from public institutional web
// presence. Confirm each against the institution's real student-mail domain
// before EDU_EMAIL ships — a wrong domain does not fail loudly, it silently
// refuses a legitimate member.
//
// The first ten keys are the shipped set, byte-identical. A key rename is a
// data migration on Education rows.

export interface PsUniversity {
  key: string;
  ar: string;
  en: string;
  /** bare registrable domain for EDU_EMAIL, or null when there is no such path */
  domain: string | null;
}

export const PS_UNIVERSITIES: readonly PsUniversity[] = [
  { key: "birzeit", ar: "جامعة بيرزيت", en: "Birzeit University", domain: "birzeit.edu" },
  {
    key: "an-najah",
    ar: "جامعة النجاح الوطنية",
    en: "An-Najah National University",
    domain: "najah.edu",
  },
  {
    key: "iug",
    ar: "الجامعة الإسلامية بغزة",
    en: "Islamic University of Gaza",
    domain: "iugaza.edu.ps",
  },
  { key: "al-quds", ar: "جامعة القدس", en: "Al-Quds University", domain: "alquds.edu" },
  { key: "bethlehem", ar: "جامعة بيت لحم", en: "Bethlehem University", domain: "bethlehem.edu" },
  { key: "hebron", ar: "جامعة الخليل", en: "Hebron University", domain: "hebron.edu" },
  {
    key: "ppu",
    ar: "جامعة بوليتكنك فلسطين",
    en: "Palestine Polytechnic University",
    domain: "ppu.edu",
  },
  {
    key: "aaup",
    ar: "الجامعة العربية الأمريكية",
    en: "Arab American University",
    domain: "aaup.edu",
  },
  {
    key: "al-azhar-gaza",
    ar: "جامعة الأزهر - غزة",
    en: "Al-Azhar University – Gaza",
    domain: "alazhar.edu.ps",
  },
  {
    key: "ptuk",
    ar: "جامعة فلسطين التقنية - خضوري",
    en: "Palestine Technical University",
    domain: "ptuk.edu.ps",
  },

  // Additions. Al-Quds Open University is the largest by enrolment and serves
  // the widest geography — exactly the members least likely to have another
  // verification path.
  { key: "qou", ar: "جامعة القدس المفتوحة", en: "Al-Quds Open University", domain: "qou.edu" },
  { key: "al-aqsa", ar: "جامعة الأقصى", en: "Al-Aqsa University", domain: "alaqsa.edu.ps" },
  {
    key: "ucas",
    ar: "الكلية الجامعية للعلوم التطبيقية",
    en: "University College of Applied Sciences",
    domain: "ucas.edu.ps",
  },
  {
    key: "paluniv",
    ar: "جامعة فلسطين الأهلية",
    en: "Palestine Ahliya University",
    domain: "paluniv.edu.ps",
  },
  { key: "up-gaza", ar: "جامعة فلسطين", en: "University of Palestine", domain: "up.edu.ps" },
  { key: "israa", ar: "جامعة الإسراء", en: "Israa University", domain: "israa.edu.ps" },
  { key: "gaza-univ", ar: "جامعة غزة", en: "Gaza University", domain: "gu.edu.ps" },
  {
    key: "dar-al-kalima",
    ar: "جامعة دار الكلمة",
    en: "Dar Al-Kalima University",
    domain: "daralkalima.edu.ps",
  },
  {
    key: "ptcdb",
    ar: "كلية فلسطين التقنية - دير البلح",
    en: "Palestine Technical College – Deir al-Balah",
    domain: "ptcdb.edu.ps",
  },
  {
    key: "muc",
    ar: "كلية العلوم الحديثة الجامعية",
    en: "Modern University College",
    domain: "muc.edu.ps",
  },
  // Vocational route. Not a university, but a real credential issuer and the one
  // that matters most for the CRAFT track — OCCUPATIONS.md §1 records that MoL
  // vocational centres describe their output as العمالة شبه الماهرة, and a
  // graduate of one has no other institutional verification path at all.
  {
    key: "mol-tvet",
    ar: "مراكز التدريب المهني - وزارة العمل",
    en: "MoL Vocational Training Centres",
    domain: null,
  },
  { key: "other", ar: "مؤسسة أخرى", en: "Other institution", domain: null },
];
