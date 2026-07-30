# OCCUPATIONS.md — the occupation model, the naming spine, and the ladder

The decision record for who Baydar is for and how standing works. `DESIGN.md` stays the
design authority; `docs/NEXT-SESSION-PROMPT.md` §B holds the rationale and the phase plan.
Companion decisions: [`FEED-RANKING.md`](FEED-RANKING.md) and [`MATCHING.md`](MATCHING.md).

Written 2026-07-30, widened the same day from crafts-only to **every occupation** — an
accounting practice, a law office, an engineering consultancy, a clinic, a design studio and
a bakery are all first-class here, and the naming spine in §0 exists so that breadth does not
turn into a pile of near-synonyms.

Read §0 before writing any code. It is the part that stops the vocabulary rotting.

## 0. The naming spine — one word per concept, everywhere

The failure mode this section prevents: "craft rank" in the API, "level" in the UI, "tier" in
the tests, "badge" in the copy, and a `WorkRecord` next to a `WorkProof` next to the existing
`Experience`. Four names for one idea and nobody can grep.

**The rule: one concept, one word, identical in Prisma, Zod, REST path, i18n key, and both UI
kits.** Phase 1 ships `scripts/check-naming.mjs` in the lint job with the banned synonyms
below as a ledger, so drift fails CI rather than accumulating.

| Concept                                            | Code           | Arabic       | Notes                                                            |
| -------------------------------------------------- | -------------- | ------------ | ---------------------------------------------------------------- |
| A row in the occupation taxonomy                   | `Occupation`   | مهنة         | replaces the earlier `Craft`. Covers crafts _and_ professions    |
| A group of occupations                             | `Family`       | مجموعة مهنية | ISCO-keyed. `Occupation.family`                                  |
| How progression works for a family                 | `Track`        | مسار         | `CRAFT` · `LICENSED` · `SERVICE` — §2                            |
| A person's claim on an occupation                  | `Claim`        | مهنة معلنة   | declared, unproven. `OccupationClaim`                            |
| Earned level, `CRAFT` track only                   | `Standing` 1–4 | مستوى        | never "rank", "tier", "level", "badge"                           |
| Statutory licence, `LICENSED` track only           | `Licence`      | رخصة مزاولة  | verified against a body, never invented — §3                     |
| One finished unit of work a counterparty confirmed | `WorkProof`    | إثبات عمل    | the single evidence primitive, all three tracks                  |
| A معلّم sponsoring someone onto the ladder         | `Vouch`        | تزكية        | distinct from endorsement                                        |
| Self-declared CV history (**exists**)              | `Experience`   | خبرة معلنة   | unchanged model; copy gains "معلنة" to contrast with `WorkProof` |
| Skill endorsement (**exists**)                     | `endorsements` | تأييد        | `ProfileSkill.endorsements`. Not a `Vouch`                       |
| Activity points (**exists**)                       | `Karama`       | كرامة        | spendable currency. Not `Standing` — see §5                      |

**Banned synonyms, enforced:** `craft rank`, `rank` (as a field name), `tier`, `level`,
`badge`, `WorkRecord`, `JobProof`, `verified craftsman`, `certification`. Also banned as
user-facing copy: معتمد، مرخّص (unless a real `Licence` is verified)، خبير، محترف as a label.
`موثّق` is reserved for identity verification and nothing else.

**One evidence primitive, three summaries.** Every occupation on Baydar accumulates the same
`WorkProof` records and the same two-sided ratings. What differs is only how that evidence is
_summarised_: a `CRAFT` occupation earns a `Standing`, a `LICENSED` one shows a `Licence` plus
raw evidence, a `SERVICE` one shows raw evidence alone. There is no second reputation system
anywhere in the product.

## 1. What was verified, and against what

The first draft proposed **أسطى** for tier 3 and **فني أول** for the technical families. The
owner rejected أسطى as Egyptian. Both are now withdrawn, and the replacement is built on
sources rather than instinct.

Primary source: **التصنيف الأردني المعياري للمهن 2021** (`sajjil.gov.jo/soc`) — 2,993
occupations, ISCO-aligned, the reference model the Palestinian NQF committee is explicitly
working from. Searched directly, occurrence counts below are from its own text.

| Claim                            | Result                                                                                                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **أسطى** as an occupational term | **0 occurrences in 2,993 occupations.** Dialect only. Owner correct                                                                                                                                        |
| **صنايعي**                       | **0 occurrences.** Real speech, but not an official title                                                                                                                                                  |
| **معلّم**                        | 52 occurrences, **every one a teaching title** — and **معلم مهني = vocational school teacher**, an occupied title, not "master craftsman"                                                                  |
| **فني**                          | **234 official titles**, always `فني + المجال` (فني تمديدات كهربائية، فني تدفئة وتهوية وتكييف، فني تكنولوجيا اللحام)                                                                                       |
| **فني أول**                      | **0 occurrences.** No `أول / ثاني / أقدم` seniority suffix exists anywhere in the classification                                                                                                           |
| **مساعد + الحرفة**               | the classification's own entry rung, paired across every trade: `دهان مباني` / `مساعد دهان مباني`، `نجّار طوبار` / `مساعد نجّار طوبار`، `سمكري` / `مساعد سمكري`، `حداد / المنيوم` / `مساعد حداد / المنيوم` |
| **مدرب مهني**                    | the official title for the person who teaches a craft                                                                                                                                                      |
| ISCO major group 7               | **«الحرفيون والمهنيون»** — which is where «الحرف والمهن» as Baydar's section name comes from                                                                                                               |

**فني أول is real but wrong here.** It returns live Gulf industrial vacancies (363 in Saudi
Arabia, July 2026, refineries and solar), rendered in English as "senior technician". It is a
Gulf employer's HR grade, absent from the ISCO-aligned Arabic classification, and nobody in a
Nablus workshop says it. Use bare **فني** — 234 official titles already do.

Secondary sources, Palestinian Ministry of Labour:

- **تلمذة مهنية** is the official term for apprenticeship (`tvet-pal.mol.pna.ps/structure`,
  «نظام التلمذة المهنية») → this is the label for `JobType.APPRENTICESHIP`, not the
  invented "تدريب مهني (صنعة)".
- **متدرّب** is the official word for someone inside a training course («الطالب / المتدرب»),
  and MoL vocational centres describe their output as **العمالة شبه الماهرة** — so
  `ماهر / شبه ماهر` is the state's own skill vocabulary.
- The ministry runs a national campaign called **«جيل الحرفة»**, which settles the register
  question for the word حرفة on public surfaces.
- Vocational training **centres** are licensed (مرخصة / غير مرخصة) — one more reason Baydar
  must never put مرخّص or معتمد on a person.

Professional-services titles, same source, same method — these are the "accounting company and
others" half of the product and they are **not** an afterthought:

- Accounting has a real ladder in official Arabic: `محاسب عام (نفقات وإيرادات)`،
  `محاسب تكاليف`، `محاسب رواتب وأجور`، `محاسب شركات`، and above them `محاسب قانوني` —
  plus `مدقق (مراجع) حسابات`، `مدير تدقيق حسابات`، `مستشار ضريبي`، `مستشار مالي`.
- Law splits the way the local profession does: `محامي نظامي`، `محامي شرعي`،
  `محامي نظامي وشرعي`، and `مستشار قانوني`، `مترجم محلف (قانوني)`.
- **Nursing carries the most explicit official ladder anywhere in the classification** —
  `ممرض مساعد مختص → ممرض عام → ممرض مؤهل → ممرض مختص → ممرض مختص متقدم → ممرض مستشار`.
  Note the senior modifiers: **متقدم** and **مستشار**, never أول. This independently confirms
  dropping فني أول.
- Also present and claimable: `مهندس معماري`، `مهندس مساحة`، `صيدلي` (many kinds)،
  `أخصائي تغذية`، `مصمم جرافيك`، `مبرمج تطبيقات`، `مترجم`، `وسيط عقاري`، `أخصائي علاقات عامة`.

## 1b. Licensed professions — the bodies, verified

Palestinian practice licensing is statutory, and Baydar does not get to out-rank it.

| Body                                                   | Site         | What it proves                                                                                                                                      |
| ------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **مجلس مهنة تدقيق الحسابات**                           | `bopa.ps`    | created under art. 3 of **قانون مزاولة مهنة تدقيق الحسابات رقم (9) لسنة 2004**; its **لجنة الترخيص** issues the **رخصة مزاولة مهنة تدقيق الحسابات** |
| **جمعية مدققي الحسابات القانونيين الفلسطينية** (PACPA) | `pacpa.ps`   | 350+ members, split into **مدققين مزاولين وغير مزاولين**                                                                                            |
| **نقابة المحامين الفلسطينيين**                         | `pbaps.ps`   | its own portal serves **«المحامين المزاولين والمتدربين»**                                                                                           |
| **نقابة المهندسين**                                    | `paleng.org` | engineering practice                                                                                                                                |

**The professions' own status vocabulary is the model — no invention required:**
**متدرّب** → **مزاول** → **غير مزاول**. That is the bar association's and PACPA's language,
and it is where متدرّب legitimately lives (alongside تلمذة مهنية for crafts) — which is exactly
why متدرّب is not a craft `Standing` rung.

Consequence for the schema: `Licence { occupationKey, bodyKey, number, status, expiresAt }`
with `status ∈ DECLARED | VERIFIED | EXPIRED` and `practice ∈ TRAINEE | PRACTISING | NON_PRACTISING`.
`DECLARED` renders as «رخصة معلنة» and carries no more weight than any other claim. Bodies live
in `PS_PROFESSIONAL_BODIES` beside `PS_OCCUPATIONS`, as constants.

## 2. Tracks — three regimes, one evidence primitive

A single progression model cannot serve a tiler, a licensed auditor and a delivery driver. The
`Family` decides which regime applies, and the regime is the only thing that varies.

| Track      | Who                                                                                                                    | Standing                                     | Why                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `CRAFT`    | construction, stone, wood, metal, aluminium, tiling, finishing, vehicles, textile, food, heritage, beauty, agriculture | **peer-earned 1–4**, §2b                     | no statutory ladder exists, and word-of-mouth is the only reputation these workers carry                                                    |
| `LICENSED` | accounting, audit, law, engineering, medicine, dentistry, pharmacy, nursing, surveying, translation (sworn)            | **none — a verified `Licence` instead**      | a نقابة or a مجلس already decides who may practise. A Baydar rank next to a statutory licence is at best noise and at worst a legal problem |
| `SERVICE`  | logistics and driving, cleaning, retail selling, general assistance                                                    | **none — `WorkProof` count and rating only** | no apprenticeship structure to model; four rungs here is a game mechanic in a qualification's clothes                                       |

A person can hold claims on several occupations across different tracks — a licensed engineer
who also runs a workshop is one profile with two claims and two regimes. That is normal here,
not an edge case.

Unclassified professional work (marketing, design, software, HR, media) sits on `SERVICE` for
standing purposes and leans on `WorkProof`, portfolio posts and `Experience` — no rank, because
no body defines one. `MATCHING.md` is where that evidence does its work.

## 2b. The craft ladder — decided

`Standing` is an integer **1–4** on `(user, occupation)`, `CRAFT` track only. Labels resolve from the family in the
string catalog, because one vocabulary cannot fit every trade: a painter's rung 3 is
**دهّان ماهر**, an electrician's is **فني تمديدات كهربائية**, and swapping them reads as a
demotion in both directions.

**Craft-trade families** — construction, stone, wood, metal, aluminium, tiling, finishing,
vehicles, textile, food, heritage, beauty:

| Rank | Masculine      | Feminine        | Pattern source                    |
| ---- | -------------- | --------------- | --------------------------------- |
| —    | حرفة معلنة     | حرفة معلنة      | declared, zero confirmed records  |
| 1    | مساعد + الحرفة | مساعدة + الحرفة | official classification pair      |
| 2    | الحرفة bare    | الحرفة bare     | official practitioner title       |
| 3    | + ماهر         | + ماهرة         | the state's own skill word        |
| 4    | معلّم + الحرفة | معلّمة + الحرفة | market summit, always craft-bound |

**Technical families** — electrical, HVAC, electronics, welding:

| Rank | Masculine      | Feminine        |
| ---- | -------------- | --------------- |
| 1    | مساعد + الحرفة | مساعدة + الحرفة |
| 2    | الحرفة bare    | الحرفة bare     |
| 3    | فني + المجال   | فنية + المجال   |
| 4    | معلّم + الحرفة | معلّمة + الحرفة |

Worked examples: `مساعد دهّان → دهّان → دهّان ماهر → معلّم دهان` ·
`مساعد كهربائي → كهربائي → فني تمديدات كهربائية → معلّم كهرباء` ·
`مساعدة خيّاطة → خيّاطة → خيّاطة ماهرة → معلّمة خياطة`.

### Rules that fall out of the evidence

- **متدرّب is not a rank.** It is the state's word for someone inside a تلمذة مهنية course, so
  it belongs to `JobType.APPRENTICESHIP` and to the trainee's status while enrolled — not to
  a rung. Rung 1 is **مساعد**, which is what a paid person working under someone is called.
- **صنايعي is not a rank either.** It is the category noun, and it is what the audience calls
  itself, so it stays: in marketing copy, in the plural («صنايعية»), and as a **search
  synonym** so typing it finds crafts. It is never a tier label.
- **معلّم always renders with its craft.** Bare معلّم means teacher to every reader arriving
  from any formal context, and rank is a structured field the query filters — never text
  matched out of a headline.
- **معلم مهني is banned outright.** It is an occupied official title meaning vocational
  school teacher.
- **صبي is rejected** despite being the most authentic word for rung 1: it means "boy", so it
  is gendered and puts a child-shaped label on a labour product.
- **مقاول is not rank 5.** The classification has `مقاول إنشاء مباني`, `مقاول عمال` — the step
  above معلّم is becoming a contractor, which is a _business_, and Baydar already models that
  as a `Company`. The ladder stops at 4 on purpose.
- **Banned everywhere:** معتمد، مرخّص، خبير، محترف as a label، فني أول، أسطى.

### Families with no ladder

Per §2: the `LICENSED` and `SERVICE` tracks have no `Standing` at all. Show the absence
plainly — a `SERVICE` profile says «لا يوجد مستوى لهذه المهنة» next to its evidence, and a
`LICENSED` profile shows the licence where the standing would be. Hiding the gap is what makes
a reputation system feel arbitrary.

### MSA fallback ladder

If the register reviewer rejects the market words under
`docs/localization-palestine.md`'s فصحى rule, this is the swap — and it must stay a JSON edit:
`مساعد حرفي → حرفي → حرفي ماهر → معلّم حرفة`. Every label is an i18n key from the first
commit, so no code moves.

## 3. Thresholds

First-pass calibration. These are guesses about a market nobody has measured, so they live in
**one exported constants object** with a `ponytail:` comment naming that ceiling, and get
revisited after three months of real records. All conditions are ANDed.

| To rank | Confirmed records in craft | Distinct counterparties | Avg rating | Min ratings | Months since first record |
| ------- | -------------------------- | ----------------------- | ---------- | ----------- | ------------------------- |
| 1       | 1                          | 1                       | —          | 0           | 0                         |
| 2       | 3                          | 3                       | ≥ 3.5      | 3           | 3                         |
| 3       | 10                         | 7                       | ≥ 4.0      | 7           | 12                        |
| 4       | 25                         | 15                      | ≥ 4.3      | 15          | 36 + one معلّم vouch      |

- **Cooldown:** one rung per 30 days, whatever the counts say.
- **Time-in-craft is load-bearing.** Without it, record count favours frequency over skill —
  a day labourer books 200 records a year while a stone mason finishes four large jobs. It is
  also the one condition nobody can farm.
- **No decay, ever.** Karama decays; a skill you had, you had.
- **Suspension, not decay:** an upheld report suspends the rank; demotion happens only through
  `ModerationAction` with an audit row.
- **Not purchasable:** a test fails if `billing/*` or `karama/*` can reach the rank writer.

### Cold start

A معلّم with twenty years who joins today and is shown as مساعد closes the app. Three paths,
in order of trust:

1. **Declared craft + years** — shown as «حرفة معلنة», never a rank. It is a claim, and the
   whole feature exists because claims are cheap.
2. **Vouching** — one معلّم vouch in the same family grants rank 2 at once; two independent
   vouches grant rank 3. Rank 4 is never vouched. If a vouchee's work is later disputed and
   the dispute upheld, the voucher loses vouch capacity for 90 days — skin in the game, or
   it is a favour economy.
3. **Founding معلّمين** — admin-granted, hard-capped at **100** in code (not policy), drawn
   from unions, chambers of commerce and known workshops, written through `ModerationAction`
   with a reason, surfaced as «موثّق يدويًا». Without it there is nobody to vouch and path 2 is
   dead on day one.

The Palestinian NQF's own stated goal includes «الاعتراف بالتعليم والخبرات السابقة» —
recognition of prior learning. That is the same problem, and it is the argument for aligning
to the framework once it is ratified (§6).

## 4. Taxonomy corrections found while verifying

Colloquial and classification Arabic disagree in three places. Store the official form,
accept the colloquial one as a search synonym through `normalizeOccupation`.

| Trap                                                                                                              | Store                                     | Synonym      |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------ |
| **سباكة officially means metal casting** (`مهندس ميكانيكي سباكة (صهر المعادن)`), not plumbing                     | «الأدوات الصحية والتدفئة»، `تمديدات صحية` | سبّاك        |
| **Aluminium work is a metal trade**: the official title is `حداد / المنيوم`, and المنيوم is the official spelling | `حداد ألمنيوم`                            | نجار ألمنيوم |
| Tiling                                                                                                            | `عامل بلاط` / `بليط رخام`                 | مبلّط، بلّاط |

Official titles worth lifting verbatim into `PS_OCCUPATIONS`, since they are both correct and
locally exact: `بناء حجر`، `نقاش حجر بناء`، `مكحل حجر`، `راصف أرضيات حجر`، `خباز تنور`،
`خباز صاج`، `خياط شعبي`، `مطرز يدوي`، `نجّار طوبار`، `حداد تسليح أبنية`، `عامل تنجيد`،
`مركب زجاج ومرايا`.

Family keys stay as listed in `NEXT-SESSION-PROMPT.md` §B3, with the ISCO major groups now
confirmed in official Arabic: 5 «العاملون في البيع والخدمات» · 6 «العمال المهرة في الزراعة
والغابات وصيد الأسماك» · 7 «الحرفيون والمهنيون» · 8 «مشغلو المصانع والآلات وعمال التجميع» ·
9 «عمال المهن الأولية».

## 4b. Business kinds

`Company` already carries verified, city, industry, members, jobs, subscriptions, invoices and
credits. One enum turns it into every kind of employer this market has, with no second model:

| `Company.kind` | Arabic        | Page shows instead of a size bucket                                                                                |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `EMPLOYER`     | شركة أو مؤسسة | default — existing behaviour, unchanged                                                                            |
| `FIRM`         | مكتب مهني     | practice `Licence`, the professions practised, partners — accounting, audit, law, engineering, consulting, clinics |
| `SHOP`         | متجر          | opening hours, occupations it hires                                                                                |
| `WORKSHOP`     | ورشة          | occupations, `Standing` of its معلّم, work-sample posts                                                            |
| `FOOD`         | منشأة غذائية  | مخبز / مطعم / مطبخ — occupations, not a "company size"                                                             |
| `FARM`         | مزرعة         | seasonal hiring, governorate                                                                                       |
| `SOLO`         | عمل فردي      | one person's own business; profile-shaped, not org-shaped                                                          |

A `FIRM` is not cosmetic: an accounting practice's page must be able to show a verified
practice licence, because that is the first thing a client looks for, and «حجم الشركة: 11-50»
answers nothing they asked.

## 5. Screen recipes

Format follows `docs/design/SCREENS.md`. Every row answers the Global Recipe there, and no
screen ships below 7/10 on the five dimensions. i18n namespace: `occupations`.

| Screen                | Web route                    | Mobile route            | Recipe                                                                                                                                            | Required states                                                       |
| --------------------- | ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Services listings     | `/jobs` (`services` tab)     | `(app)/jobs/index` tab  | existing `Tabs` strip «الوظائف \| الخدمات», occupation + governorate chips, dense `RecordCard`, one contact action — **no new route**             | loading, empty-in-governorate, no-occupation-selected, offline retry  |
| Practitioner search   | `/search`                    | `(app)/search`          | occupation + governorate facets; order by `Standing` → licence → rating → recency, per track                                                      | initial prompt, no results in governorate, mixed-direction query      |
| Occupation section    | `/in/[handle]`               | `(app)/in/[handle]`     | one block per `Claim`: `Standing` chip (CRAFT), licence chip (LICENSED), or evidence only (SERVICE); `WorkProof` count, rating, work-sample strip | unclaimed, «مهنة معلنة» unproven, expired licence, suspended standing |
| Standing detail       | sheet from the standing chip | `Sheet` from the chip   | current rung, the five conditions with progress, what is missing — **a sheet, not a route**                                                       | at rank 4, cooldown, rating-blocked, suspended, wrong track           |
| Licence claim         | `/me/edit` section           | `(app)/me/edit` section | occupation + body picker from `PS_PROFESSIONAL_BODIES`, number, expiry, practice status (متدرّب/مزاول/غير مزاول)                                  | declared-not-verified, verification pending, expired, rejected        |
| Occupation onboarding | `/(app)/onboarding`          | `(app)/onboarding`      | fork on «أعمل بمهنة حرة أو حرفة» → occupation picker, governorate, declared years, work photos or licence; reuses `OnboardingProgress`            | validation, upload failure, skip, resume mid-fork                     |
| Work confirmation     | application detail           | application detail      | counterparty confirms a finished `WorkProof` in a bounded window; the worker cannot confirm both ends                                             | pending, expired window, confirmed, disputed, already counted         |
| Business page by kind | `/company/[slug]`            | `(app)/company/[slug]`  | header shaped by `Company.kind` per §4b; `FIRM` leads with its practice licence                                                                   | no occupations listed, unverified, expired firm licence, no jobs      |
| Service request       | `/(app)/jobs/request`        | `(app)/jobs/request`    | a person posts `DAY_LABOR`/`PIECE_WORK` with no company; basis-aware money copy («أجر اليوم»، «سعر المقطوعة»)                                     | validation, no occupation chosen, posted, quota/rate-limited          |

**Mobile overrides** are the ones already in `SCREENS.md` — `SafeAreaView`, `FlatList` for the
listing screens, 44pt targets, haptics on the confirm action, one column at
`nativeTokens.space[4]`.

**Copy that must change with this work**, found in the catalogs:
`employer.newJob.salaryMin` reads «الحد الأدنى للراتب», and راتب is a monthly salary — a
day-rate form asking for a راتب tells the poster this app was not built for them. Basis-aware
**أجر**. And `jobs.typeLabels.INTERNSHIP` is currently «تدريب», which now collides with
تلمذة مهنية — it becomes «تدريب جامعي».

## 6. The verify-list, answered

Closes `NEXT-SESSION-PROMPT.md` §B14.

| #   | Item                            | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Register of صنايعي / معلّم      | **Answered with evidence, still owner's call.** Both are absent from official classification (صنايعي 0 hits; معلّم only as teacher). Ladder now leans on official patterns and keeps صنايعي as category noun + search synonym. MSA fallback written in §2                                                                                                                                                                                                                          |
| 2   | Per-family override wording     | **Corrected.** فني أول dropped — 0 classification hits, and its live usage is Gulf industrial HR. Bare فني adopted, backed by 234 official titles                                                                                                                                                                                                                                                                                                                                  |
| 3   | ISCO Arabic group names         | **Closed.** All nine verified from `sajjil.gov.jo/soc`; group 7 «الحرفيون والمهنيون» is where the section name comes from                                                                                                                                                                                                                                                                                                                                                          |
| 4   | Palestinian TVET / NQF ladder   | **Answered: nothing to align to yet.** The PNQF was still pre-Cabinet as of 2026-05-17 — a ministerial committee formed end-2021, first draft consulted with GIZ and ETF, «سيتم رفع الإطار إلى مجلس الوزراء» plus a dedicated law being drafted. Do not claim alignment. **Revisit when ratified**: it includes recognition of prior learning, which is exactly what a confirmed-work record is, and its own reference models are the Jordanian framework and إطار المؤهلات العربي |
| 5   | Craft family list               | **Open — the one item still owed.** Needs a tradesperson, not a search engine. §4 fixed three naming traps; the family set itself is unconfirmed and keys are forever                                                                                                                                                                                                                                                                                                              |
| 6   | Construction labour composition | **Not needed.** No permit facet is being built, so nothing depends on it                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7   | Licensed-profession bodies      | **Closed** — §1b. BOPA under law 9/2004 with a licensing committee, PACPA's مزاول/غير مزاول split, the bar's مزاولين/متدربين portal, نقابة المهندسين. Baydar verifies licences and invents no rank for these professions                                                                                                                                                                                                                                                           |

Phase 1 may start on §2–§5 while item 5 is open, **except** freezing `PS_OCCUPATIONS` keys.
Land the family keys last in that PR, after one conversation with someone in the trade.
Everything else — enums, `Standing`, `WorkProof`, `Licence`, contracts, the naming gate — is
unblocked.
