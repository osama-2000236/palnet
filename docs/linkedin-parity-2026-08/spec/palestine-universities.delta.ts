// spec/palestine-universities.delta.ts
//
// REPLACEMENT DATA for PS_UNIVERSITIES in packages/shared/src/palestine.ts.
//
// Two changes to the shipped table:
//   1. Adds `domain: string | null` — required by EDU_EMAIL verification
//      (master spec §5.4.2). Without it, the verification service has nothing
//      to match an email address against and the whole method is unbuildable.
//   2. Adds the institutions the shipped table of 10 omits, including every
//      Gaza institution beyond IUG and Al-Azhar, and Al-Quds Open University,
//      which is the largest by enrolment and serves the widest geography —
//      exactly the members least likely to have another verification path.
//
// Rules:
//   1. The ten existing keys are byte-identical. Do not renumber, rename or
//      reorder them; a key rename is a data migration on Education rows.
//   2. `domain` is the bare registrable domain, lowercase, no scheme, no www.
//      Subdomains match: a student address at `students.najah.edu` matches
//      `najah.edu` by suffix. Implement the match as a suffix test on a
//      dot-boundary, never a substring test — `notnajah.edu` must not match.
//   3. `domain: null` means no EDU_EMAIL path for that institution. It is a
//      legitimate value, not a TODO: the member falls back to PHONE or
//      WORK_EMAIL verification and the UI says which paths are available.
//   4. OWNER-INPUT: domains are recorded from public institutional web
//      presence. Before EDU_EMAIL ships, each should be confirmed against the
//      institution's actual student-mail domain, because a wrong domain here
//      does not fail loudly — it silently refuses a legitimate member.

export const PS_UNIVERSITIES_V2 = [
  // ── existing ten, unchanged keys, domain added ──
  { key: "birzeit", ar: "جامعة بيرزيت", en: "Birzeit University", domain: "birzeit.edu" },
  {
    key: "an-najah",
    ar: "جامعة النجاح الوطنية",
    en: "An-Najah National University",
    domain: "najah.edu",
  },
  { key: "iug", ar: "الجامعة الإسلامية بغزة", en: "Islamic University of Gaza", domain: "iugaza.edu.ps" },
  { key: "al-quds", ar: "جامعة القدس", en: "Al-Quds University", domain: "alquds.edu" },
  { key: "bethlehem", ar: "جامعة بيت لحم", en: "Bethlehem University", domain: "bethlehem.edu" },
  { key: "hebron", ar: "جامعة الخليل", en: "Hebron University", domain: "hebron.edu" },
  {
    key: "ppu",
    ar: "جامعة بوليتكنك فلسطين",
    en: "Palestine Polytechnic University",
    domain: "ppu.edu",
  },
  { key: "aaup", ar: "الجامعة العربية الأمريكية", en: "Arab American University", domain: "aaup.edu" },
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

  // ── additions ──
  {
    key: "qou",
    ar: "جامعة القدس المفتوحة",
    en: "Al-Quds Open University",
    domain: "qou.edu",
  },
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
  // Vocational route. Not a university, but a real credential issuer and the
  // one that matters most for the CRAFT track — OCCUPATIONS.md §1 records that
  // MoL vocational centres describe their output as العمالة شبه الماهرة, and a
  // graduate of one has no other institutional verification path at all.
  {
    key: "mol-tvet",
    ar: "مراكز التدريب المهني - وزارة العمل",
    en: "MoL Vocational Training Centres",
    domain: null,
  },
  { key: "other", ar: "مؤسسة أخرى", en: "Other institution", domain: null },
] as const;

export const PS_UNIVERSITY_COUNT = 22;

// Certificate issuers, for Certificate.issuerKey (master spec §5.2.1).
// Deliberately short: an issuer list that tries to be exhaustive becomes
// stale, and Certificate.issuerName is free text for everything not here.
// These are the issuers whose names must render consistently because they
// appear often enough that three spellings would look careless.
export const PS_ISSUERS = [
  ...PS_UNIVERSITIES_V2.map((u) => ({ key: u.key, ar: u.ar, en: u.en })),
  { key: "pita", ar: "اتحاد شركات أنظمة المعلومات (بيتا)", en: "PITA" },
  { key: "pba", ar: "نقابة المحامين الفلسطينيين", en: "Palestinian Bar Association" },
  { key: "paleng", ar: "نقابة المهندسين", en: "Engineers Association" },
  { key: "pacpa", ar: "جمعية مدققي الحسابات القانونيين الفلسطينية", en: "PACPA" },
  { key: "bopa", ar: "مجلس مهنة تدقيق الحسابات", en: "Board of Audit Profession" },
  { key: "baydar", ar: "بيدر", en: "Baydar" },
  { key: "other", ar: "جهة أخرى", en: "Other issuer" },
] as const;

// VolunteerRole.causeKey. Six only. §3.1 #14 rejects LinkedIn's "causes you
// care about" as politically loaded here; these six are descriptions of work
// somebody actually did, which is a different thing.
export const PS_CAUSE_KEYS = [
  { key: "relief", ar: "الإغاثة والمساعدات", en: "Relief & Aid" },
  { key: "education", ar: "التعليم", en: "Education" },
  { key: "health", ar: "الصحة", en: "Health" },
  { key: "heritage", ar: "التراث والثقافة", en: "Heritage & Culture" },
  { key: "youth", ar: "الشباب والرياضة", en: "Youth & Sport" },
  { key: "environment", ar: "البيئة والزراعة", en: "Environment & Agriculture" },
] as const;
