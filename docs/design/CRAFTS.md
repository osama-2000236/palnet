# CRAFTS.md — the craft ladder, decided

Phase 0 of the crafts expansion. `DESIGN.md` stays the design authority and
`docs/NEXT-SESSION-PROMPT.md` §B holds the rationale and the phase plan; this file is the
decision record the later phases build against. Written 2026-07-30.

Nothing here is code. Phase 1 implements §3–§5; phase 0 is closed when the owner accepts §2.

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

## 2. The ladder — decided

Rank is an integer **1–4** on `(user, craft)`. Labels resolve from the craft family in the
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

`logistics` (drivers), `cleaning`, and retail selling get confirmed-work count and rating,
**no rank**. Driving is licensed elsewhere and none of the three has an apprenticeship
structure to model; four rungs there is a game mechanic wearing a qualification's clothes.
Say so in the UI rather than hiding the absence.

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
accept the colloquial one as a search synonym through `normalizeCraft`.

| Trap                                                                                                              | Store                                     | Synonym      |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------ |
| **سباكة officially means metal casting** (`مهندس ميكانيكي سباكة (صهر المعادن)`), not plumbing                     | «الأدوات الصحية والتدفئة»، `تمديدات صحية` | سبّاك        |
| **Aluminium work is a metal trade**: the official title is `حداد / المنيوم`, and المنيوم is the official spelling | `حداد ألمنيوم`                            | نجار ألمنيوم |
| Tiling                                                                                                            | `عامل بلاط` / `بليط رخام`                 | مبلّط، بلّاط |

Official titles worth lifting verbatim into `PS_CRAFTS`, since they are both correct and
locally exact: `بناء حجر`، `نقاش حجر بناء`، `مكحل حجر`، `راصف أرضيات حجر`، `خباز تنور`،
`خباز صاج`، `خياط شعبي`، `مطرز يدوي`، `نجّار طوبار`، `حداد تسليح أبنية`، `عامل تنجيد`،
`مركب زجاج ومرايا`.

Family keys stay as listed in `NEXT-SESSION-PROMPT.md` §B3, with the ISCO major groups now
confirmed in official Arabic: 5 «العاملون في البيع والخدمات» · 6 «العمال المهرة في الزراعة
والغابات وصيد الأسماك» · 7 «الحرفيون والمهنيون» · 8 «مشغلو المصانع والآلات وعمال التجميع» ·
9 «عمال المهن الأولية».

## 5. Screen recipes

Format follows `docs/design/SCREENS.md`. Every row answers the Global Recipe there, and no
screen ships below 7/10 on the five dimensions. i18n namespace: `crafts`.

| Screen                | Web route                | Mobile route               | Recipe                                                                                                                           | Required states                                                  |
| --------------------- | ------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Services listings     | `/jobs` (`services` tab) | `(app)/jobs/index` tab     | existing `Tabs` strip «الوظائف \| الخدمات», craft + governorate chips, dense `RecordCard`, one contact action — **no new route** | loading, empty-in-governorate, no-craft-selected, offline retry  |
| Craft worker search   | `/search`                | `(app)/search`             | craft + governorate facets, ordered rank → rating → recency; rank chip on every result row                                       | initial prompt, no results in governorate, mixed-direction query |
| Craft section, public | `/in/[handle]`           | `(app)/in/[handle]`        | rank chip bound to craft, confirmed-record count, rating, work-sample strip, «حرفة معلنة» when unranked                          | unranked, no work samples, suspended rank, viewer-is-self        |
| Ladder detail         | sheet from the rank chip | `Sheet` from the rank chip | current rung, the four conditions with progress, what is missing — **a sheet, not a route**                                      | at rank 4, blocked by cooldown, blocked by rating, suspended     |
| Craft onboarding fork | `/(app)/onboarding`      | `(app)/onboarding`         | «أعمل بحرفة» branch → craft picker, governorate, declared years, work photos; reuses `OnboardingProgress`                        | validation, upload failure, skip, resume mid-fork                |
| Work confirmation     | application detail       | application detail         | counterparty confirms finished work in a bounded window; worker cannot confirm both ends                                         | pending, expired window, confirmed, disputed, already counted    |
| Shop page             | `/company/[slug]`        | `(app)/company/[slug]`     | header shaped by `Company.kind`; KITCHEN/WORKSHOP show crafts, not a company-size bucket                                         | no crafts listed, unverified, no jobs                            |
| Service request       | `/(app)/jobs/request`    | `(app)/jobs/request`       | a person posts `DAY_LABOR`/`PIECE_WORK` with no company; basis-aware money copy («أجر اليوم»، «سعر المقطوعة»)                    | validation, no craft chosen, posted, quota/rate-limited          |

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

Phase 1 may start on §3–§5 while item 5 is open, **except** freezing `PS_CRAFTS` keys. Land
the family keys last in that PR, after one conversation with someone in the trade.
