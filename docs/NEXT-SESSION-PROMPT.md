# NEXT-SESSION-PROMPT — leftovers + the crafts expansion

Written 2026-07-30 against `main` @ `c8248a7`. Revised the same day with the terminology and
job-type research below. Rewritten in place, not appended to.

Paste **Part A** or **Part B** (not both) into a fresh session. They are two different kinds
of work and mixing them in one session produces a bundled commit, which `CLAUDE.md` forbids.

Read order for either part: `CLAUDE.md` → `project-spec.md` → `DESIGN.md` → `BRAND.md` →
`docs/HANDOFF.md`. `docs/HANDOFF.md` is the live status; this file is the queue.

---

# Part A — the leftovers

> You are contributing to Baydar, an Arabic-first RTL professional network in a Turborepo
> with Next 16 web, Expo SDK 54 mobile, NestJS 11 REST API, Prisma 6/Postgres, and shared
> `@baydar/*` packages. Read `project-spec.md`, `DESIGN.md`, `docs/design/RTL.md`, and
> `docs/HANDOFF.md` first. Do not introduce dependencies, UI styles, public API shapes, or
> architectural patterns the request does not ask for. Tokens and i18n are mandatory.
>
> The feature surface is complete. What is left is the list below. Pick items **only** from
> "Actionable now". One item = one PR. After each, run format, lint, `lint:tokens`,
> type-check and test, plus the gate that covers what you touched (`check:i18n`,
> `check:ui-lockstep`, `check:native-versions`, `test:gates`, `check:security-headers`,
> `check:release-production`). On a fresh clone run `pnpm --filter @baydar/db db:generate`
> before `type-check` or `test`, or the whole gate fails on a misleading `TS2305`.

### Actionable now — no owner, no credential

| #   | Item                                     | Where                                                       | Notes                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Prisma 7**                             | `packages/db`                                               | Prisma 7 rejects `datasource.url` in the schema. Needs `prisma.config.ts` + a driver adapter — a rewire of the production DB connection. Own PR, staging soak, no other change riding along.                                                                                      |
| 2   | **Mobile screenshots are viewport-only** | `apps/mobile/e2e/shots.mjs`                                 | The harness cannot scroll, so `me/edit` and `settings/notifications` have never been reviewed below the fold. Teach it to scroll-and-stitch, or capture N viewports per screen.                                                                                                   |
| 3   | **Mobile console capture is blind**      | same harness                                                | `logcat` carries no `ReactNativeJS` on this stack. The harness says so loudly instead of writing `{}`; fix it or document the working channel.                                                                                                                                    |
| 4   | **The dev-client bundle redbox**         | `docs/audit/VISION-QA-2026-07-29.md` §"Not fixed, recorded" | `Compiling JS failed: <line>:<col>` that moves between attempts on a bundle `hermesc -emit-binary` compiles with exit 0. Transport or on-disk corruption of a ~16 MB bundle. Try a release/embedded build, a physical device, a smaller bundle. Cheap first check is in that doc. |
| 5   | **`ponytail:` debt ledger**              | 20 markers across 17 files                                  | Run `/ponytail-debt`. Most are correct-as-written; convert the ones whose named ceiling has actually been hit — §B5 below shows one that has.                                                                                                                                     |

### Blocked upstream — verified against the packages, do not retry

- **Jest 30** — `jest-expo@57`, latest, still depends on the Jest 29 toolchain. Not gated on the Expo upgrade.
- **ESLint 10** — `eslint-plugin-import`, latest, caps at 9.
- **Expo 54 → 57** — needs the physical-device smoke run. Do not ship it on emulator evidence, and item 4 above blocks the emulator anyway.

### Owner-gated — do not attempt, do not stub

Every row needs an account, a credential, or a human. Full table with evidence lines in
`docs/HANDOFF.md` §"Launch blockers". Summary: production env vars (`CORS_ORIGINS`,
`BAYDAR_WEB_URL`, `INTERNAL_CRON_TOKEN`), Resend, HyperPay merchant onboarding, bank IBAN,
the two scanner URLs, Sentry, Apple/Play identifiers, EAS credentials, the real staging
hostname, physical-device smoke evidence, the 47-string Arabic register review
(`docs/audit/ARABIC-REGISTER-2026-07-25.md`), and counsel review of `legal-copy.tsx` (still
v0.1 placeholder, three paragraphs per page).

If a leftover you want turns out to need one of these, stop and say so. Do not fabricate a
value to get a green run.

---

# Part B — the crafts expansion (الحرف والمهن)

A product change, not a cleanup. Read all of Part B before writing code.

## B0. Why — the product models the wrong worker

Baydar today models one worker: salaried, CV-shaped, NGO/tech/finance, with a degree row and
an employer row. `PS_INDUSTRIES` leads with NGOs because they are the largest _formal_
employers. Most Palestinian working people are not in that set. They are electricians,
builders, stone masons, tilers, welders, aluminium fitters, plumbers, painters, car
mechanics, bakers, cooks, tailors, embroiderers, barbers, phone-repair technicians, farmers,
drivers — largely self-employed or day-hired, largely found by word of mouth, mostly with no
CV and no intention of writing one.

For that worker the network's job is not "showcase your résumé". It is **carry your
reputation between customers**, because today that reputation lives only in the head of
whoever last hired them, and dies when they move governorate.

This is also the closest fit Baydar has to its own name. البيدر is where you bring what you
harvested to be **measured** in public. A CV is a claim; a record of finished work that the
people who paid for it confirmed is a measurement.

## B1. The idea, stated precisely

1. **Crafts and shops become first-class** alongside jobs and companies — a workshop, a
   bakery, a garage, a retail shop, a home kitchen are all businesses on Baydar, and craft
   work is a listing type.
2. **A craft ladder**: a worker holds an earned rank **per craft**, shown on the profile and
   sortable in search, climbed **only** by finished work a counterparty confirmed. Not by
   activity, not by posting, not by paying.

### The rank is a credential, not a currency

Karama already exists (`KaramaLedger`, `KARAMA_EARN`, `KaramaService`): earned by activity,
**spendable** on boosts and premium, capped at 5000, decaying 1%/month on inactivity. The
craft rank must be its opposite on every axis.

|             | Karama (exists)                        | Craft rank (new)                                           |
| ----------- | -------------------------------------- | ---------------------------------------------------------- |
| Earned by   | activity, endorsements, hires, ratings | confirmed finished work, plus time in craft — nothing else |
| Spendable   | yes                                    | never                                                      |
| Purchasable | effectively yes (premium ↔ points)     | **never** — no billing or Karama path may write a rank     |
| Decays      | yes, on inactivity                     | no — a skill you had, you had                              |
| Reversible  | via `ADJUSTMENT`                       | only by dispute or moderation, with an audit row           |

Conflating them kills the feature: the moment a rank can be bought, Baydar is selling trust,
and a homeowner choosing an electrician from this app finds that out the hard way. Ship a
test that fails if `billing/*` or `karama/*` can reach the rank writer.

## B2. Arabic terminology — the corrected ground

The first draft of this doc proposed **أسطى** for tier 3. **That was wrong and is withdrawn.**

> **Research constraint, stated honestly:** WebSearch and WebFetch were both unavailable in
> the session that wrote this (`x-ai/grok-4.5` routing error — WebFetch returns HTTP status
> but its summarizer never runs). Everything below is reasoned from linguistic knowledge and
> repo evidence, with a confidence label per claim and a verify-list in §B14. Do not treat
> the ⚠️ rows as settled.

### Why أسطى is out — high confidence

- Turkish loanword (_usta_, "master craftsman"), itself from Persian; entered Arabic through
  Ottoman administration. Same root family as أستاذ.
- Its living centre of gravity is **Egypt**, where it is the default address for a driver, a
  mechanic, a craftsman. Egypt's handyman app is literally branded **Mr. Usta**, which is
  the market telling you whose word it is.
- In the Levant the loan survives thinly (أسطة/أوسطة) and reads as either Egyptian-imported
  or dated. It is not what a Palestinian صنايعي calls himself.
- Verdict: **do not ship it**, in any tier, in any register. The owner's correction stands.

### The words Palestinians actually use — high confidence

| Word                     | What it means in the trades                                                   | Register             | Use in product                                          |
| ------------------------ | ----------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------- |
| **صنايعي** (pl. صنايعية) | a skilled manual tradesman — the category word                                | Levantine colloquial | ✅ tier 2 default, and the audience-facing noun         |
| **معلّم**                | the master: runs the workshop, takes on trainees, answers for the job         | Levantine, universal | ✅ tier 4 — see the collision warning below             |
| **ماهر**                 | "skilled" — the word official classifications use (عامل ماهر / نصف ماهر)      | formal, pan-Arab     | ✅ tier 3 as a qualifier (`صنايعي ماهر`)                |
| **حرفي / حرفة**          | craftsperson / craft                                                          | MSA                  | ✅ category chrome ("الحرف والمهن"), and the fem. forms |
| **فني**                  | technician — the _higher_ register for HVAC, electronics, appliances, devices | formal, pan-Arab     | ✅ per-family ladder override (see below)               |
| **متدرّب**               | trainee, someone on a path                                                    | formal-neutral       | ✅ tier 1                                               |
| **مياومة / عامل مياومة** | day-rate work / day labourer                                                  | standard + official  | ✅ `JobType.DAY_LABOR` copy                             |
| **بالمقطوعة**            | the whole job for one agreed price                                            | standard             | ✅ `JobType.PIECE_WORK` copy                            |
| **صبي** (صبي المعلّم)    | the apprentice boy in a workshop                                              | Levantine colloquial | ❌ **do not use** — see below                           |
| **خليفة**                | foreman / second under the معلّم (Syrian workshop usage)                      | narrow               | ❌ too regional, most Palestinians won't know it        |

**صبي is the trap.** It is the most authentic word for tier 1 and must still be rejected: it
literally means "boy", so it is gendered, it reads as demeaning to a 40-year-old changing
trade, and shipping a child-shaped label on a labour product is a safeguarding optics problem
nobody wants to explain. **متدرّب** carries the same slot with none of that. Note the framing
that goes with it: **مبتدئ names a lack; متدرّب names a path.** Use مبتدئ only in
explanatory copy ("من متدرّب إلى معلّم"), never as a label.

**معلّم collides with "school teacher"** — high confidence, and it has two concrete
engineering consequences, not just a copy nit:

1. Search: an occupation string "معلّم" and a craft rank "معلّم" land in the same folded
   index (`baydar_fold`). Rank must be a structured field the query filters on, never text
   matched out of a headline.
2. Copy: the rank must always render with its craft — «معلّم بلاط», «معلّم كهرباء» — never
   bare. That is also how the trade actually says it, so this costs nothing.

### One ladder, four rungs, labels resolved per craft family

Any single vocabulary misfits half the crafts: a tiler's summit is **معلّم**, but an HVAC
worker's summit is **فني أول** and calling him معلّم sounds like a demotion; a cook's is
**رئيس طهاة**. So model **rank as a number 1–4** and resolve the label from
`craftFamily` in the string catalog. Zero extra logic, no schema cost, and if the
native-speaker reviewer decides one set is fine, the map collapses to one entry and nothing
else changes.

**Default set (construction, metal, wood, stone, vehicle, general):**

| Rank | Masculine      | Feminine        | Note                                     |
| ---- | -------------- | --------------- | ---------------------------------------- |
| 1    | متدرّب         | متدرّبة         | entry, no age or gender implication      |
| 2    | صنايعي         | حرفية           | fem. of صنايعي is awkward → MSA register |
| 3    | صنايعي ماهر    | حرفية ماهرة     | ماهر is the official skill word          |
| 4    | معلّم + الحرفة | معلّمة + الحرفة | always rendered with the craft           |

**Overrides — ⚠️ medium confidence on exact wording, reviewer decides:**

| Family                                  | 1      | 2              | 3          | 4           |
| --------------------------------------- | ------ | -------------- | ---------- | ----------- |
| تكييف وتبريد · إلكترونيات · صيانة أجهزة | متدرّب | فني مساعد      | فني        | فني أول     |
| طعام ومخابز وحلويات                     | متدرّب | طاهٍ / خبّاز   | طاهٍ أول   | رئيس طهاة   |
| خياطة وتطريز                            | متدرّب | خيّاط / مطرّزة | خيّاط ماهر | معلّم خياطة |
| زراعة وحصاد                             | —      | —              | —          | —           |
| نقل وتوصيل · تنظيف · بيع بالتجزئة       | —      | —              | —          | —           |

**Two families deliberately have no ladder.** Driving is licensed elsewhere and cleaning,
delivery and retail have no apprenticeship structure to model — a four-rung ladder there is a
game mechanic pretending to be a qualification. They get confirmed-work count and rating,
no rank. Say so in the UI rather than hiding it. Scoping the ladder to the crafts that
actually have one is what keeps it credible.

### The gender consequence — high confidence, and it is bigger than it looks

Palestinian women work in خياطة، تطريز، تجميل وحلاقة نسائية، طهي وصناعات غذائية منزلية،
زراعة, and the craft vocabulary is far more gendered than the office vocabulary the app was
built on. `docs/localization-palestine.md` already specifies `key.masc` / `key.fem` keyed off
`Profile.pronouns`. **Every rank label needs both forms from the first commit**, and where the
feminine of the market word is awkward (صنايعية) the feminine uses the MSA register
(حرفية). This roughly doubles the rank string count — plan for it rather than discovering it
in review, and note `check:i18n` will hold you to parity across both platforms.

### Words that are banned

- **معتمد** (certified) and **مرخّص** (licensed) — Baydar does not license tradespeople.
  A licence claim is a legal exposure, not a wording preference. **موثّق** stays reserved for
  identity verification only.
- **خبير** (expert) — title inflation with nothing behind it.
- **محترف** — right for the marketing line ("من متدرّب إلى معلّم"), wrong as a label; it reads
  as a game tier.
- Anything implying a Ministry of Labour or union qualification the app has not verified.

## B3. The taxonomy — wide, and compatible on purpose

`PS_CRAFTS` goes in `packages/shared/src/palestine.ts` next to `PS_INDUSTRIES`: plain
constants, canonical Arabic stored, **no DB table** — the same reasoning already written in
that file's `ponytail:` header for `PS_CITIES`. Add `normalizeCraft()` built on `foldArabic`,
exactly like `normalizeCity`, or "كهربائي" and "كهربائى" become two crafts.

**Key every family to ISCO-08** — one extra string field in the constant, near-zero cost, and
it buys: CV export that maps to a standard code, comparability with PCBS/ILO labour data, and
ingestibility by any future TVET, ministry or ILO-programme partner. Retrofitting taxonomy
keys after launch is painful; adding them now is a line of data per row.
⚠️ Verify the exact Arabic ISCO group names against the official ILO Arabic translation
before printing them in UI; the group numbers below are high confidence, the Arabic wording
is not.

| Family key     | Arabic                     | Example crafts                                             | ISCO-08 |
| -------------- | -------------------------- | ---------------------------------------------------------- | ------- |
| `construction` | البناء والإنشاءات          | بنّاء، طوبار، حداد باطون، عامل بناء                        | 711     |
| `stone-marble` | الحجر والرخام              | قصّار حجر، نقّاش حجر، تركيب رخام                           | 711/721 |
| `electrical`   | الكهرباء                   | كهربائي مباني، كهربائي صناعي، تمديدات، طاقة شمسية          | 741     |
| `plumbing`     | الأدوات الصحية والتدفئة    | سباك، تركيب سخانات، تمديدات صحية                           | 712     |
| `hvac`         | التكييف والتبريد           | فني تكييف، تبريد، صيانة مكيفات                             | 713/741 |
| `carpentry`    | النجارة                    | نجار موبيليا، نجار ديكور، نجار باطون                       | 711/752 |
| `aluminium`    | الألمنيوم والزجاج          | نجار ألمنيوم، تركيب زجاج، مقاطع                            | 712/721 |
| `metalwork`    | الحدادة واللحام            | حداد، لحّام، خراطة، تشكيل معادن                            | 721/722 |
| `finishing`    | الدهان والتشطيبات          | دهّان، جبس، ديكور، عزل                                     | 713     |
| `tiling`       | البلاط والسيراميك          | بلّاط، تركيب سيراميك، تركيب باركيه                         | 712     |
| `vehicles`     | ميكانيك المركبات           | ميكانيكي، كهربائي سيارات، سمكرة ودهان، بنشر                | 723     |
| `electronics`  | الإلكترونيات والأجهزة      | صيانة هواتف، صيانة أجهزة منزلية، حاسوب                     | 742     |
| `food`         | الطعام والمخابز والحلويات  | طاهٍ، خبّاز، حلونجي، شاورما، معجنات                        | 512/751 |
| `home-food`    | الصناعات الغذائية المنزلية | مونة، مخللات، ألبان، زيت وزعتر                             | 751     |
| `textile`      | الخياطة والتطريز           | خيّاط، مطرّزة (تطريز فلسطيني)، تنجيد                       | 753     |
| `heritage`     | الحرف التراثية             | صابون نابلسي، خزف وزجاج الخليل، نحت خشب الزيتون، سجاد يدوي | 731     |
| `beauty`       | الحلاقة والتجميل           | حلاق، تجميل، عناية                                         | 514     |
| `agriculture`  | الزراعة والحصاد            | قطف الزيتون، تقليم، دفيئات، تشحيل                          | 611/921 |
| `logistics`    | النقل والتوصيل             | سائق، نقل أثاث، توصيل                                      | 832/933 |
| `cleaning`     | التنظيف والصيانة العامة    | تنظيف منازل، تنظيف مكاتب، صيانة عامة                       | 911/515 |

`heritage`, `stone-marble`, `home-food` and the تطريز entry are the rows that make this
Palestine-first rather than a generic handyman clone. Stone and marble is one of the
territory's largest industrial export sectors; صابون نابلسي and Hebron glass are named
crafts with real workshops behind them. ⚠️ Confirm the family list with someone in the trade
before freezing keys — keys are forever, Arabic labels are an i18n edit.

## B4. Job types — three axes, currently collapsed into one

`JobType` today conflates three orthogonal things, which is exactly why bolting `DAY_WORK`
onto it feels wrong: `FULL_TIME` and day labour are not the same kind of fact.

1. **Engagement** — what the relationship is.
2. **Time commitment** — full or part.
3. **Pay basis** — monthly, daily, hourly, per job, per piece.

Do **not** split into three enums. Users pick one "type of work"; three dropdowns is a worse
form and a bigger diff. Keep `JobType` as the single engagement facet, extend it, and add
`payBasis` for money. Existing rows stay valid, which is the whole point.

**`JobType` — 6 values today, 11 after.** Blast radius is 18 files (`grep FULL_TIME`), of
which the ones that matter are `packages/shared/src/enums.ts`, `schema.prisma`, both message
catalogs, `jobs/filters.tsx`, both `employer/.../jobs/new` forms, and `job-alerts.service`.

| Value               | Arabic (`jobs.typeLabels.*`) | Why it exists                                                                                         |
| ------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `FULL_TIME` ✓       | دوام كامل                    | unchanged                                                                                             |
| `PART_TIME` ✓       | دوام جزئي                    | unchanged                                                                                             |
| `CONTRACT` ✓        | عقد محدد المدة               | **relabel** — today just "عقد", which a مقاول reads as مقاولة. Fixed-term employment, not a job price |
| `TEMPORARY` ✓       | عمل مؤقت                     | unchanged                                                                                             |
| `INTERNSHIP` ✓      | تدريب جامعي                  | **relabel** — today "تدريب", which now collides with the new apprenticeship value                     |
| `VOLUNTEER` ✓       | تطوع                         | unchanged                                                                                             |
| `DAY_LABOR` 🆕      | مياومة                       | the single biggest gap; day-wage work is a large share of this market and has no representation       |
| `PIECE_WORK` 🆕     | بالمقطوعة                    | tiler per metre, painter per room, tailor per piece, picker per tree — the craft default              |
| `SEASONAL` 🆕       | عمل موسمي                    | olive season, planting, Ramadan retail, tourism. Recurs annually — see below                          |
| `APPRENTICESHIP` 🆕 | تدريب مهني (صنعة)            | a معلّم posting for a متدرّب. This is the ladder's entry ramp — the two halves of B2 and B4 meet here |
| `FREELANCE` 🆕      | عمل حر                       | design, tutoring, accounting, remote work — a real Palestinian export sector, unrepresented           |

Rejected on purpose: `ON_CALL` (`PIECE_WORK` covers it, no distinct behaviour),
`COOPERATIVE`, `SHIFT`. One enum value with no behaviour behind it is a filter that returns
nothing.

**`SEASONAL` earns its keep beyond a label.** Seasonal work recurs, and `JobAlert` already
exists — so "notify me when olive-season work is posted near me" is a saved alert, not a new
subsystem. Cheapest high-value thing in this phase.

**`payBasis` — new enum, `MONTHLY` default so no data migration.**
`MONTHLY | DAILY | HOURLY | PER_JOB | PER_PIECE | COMMISSION`.

Keep the `salaryMin` / `salaryMax` column names — they are in the API contract and renaming
them touches Zod, DTOs, both apps and alerts for no user-visible gain (`ponytail:` comment
naming that ceiling). **But the copy must change**: `employer.newJob.salaryMin` currently
reads «الحد الأدنى للراتب», and راتب means a monthly salary. For مياومة the right word is
**الأجر** — «أجر اليوم», «أجر الساعة», «سعر المقطوعة». Make those labels basis-aware. A
day-rate form asking for a "راتب" tells the poster this app was not built for them, in four
characters.

**Currency:** `ILS` default already, with `USD`/`JOD`/`EUR` allowed — correct for this
market, no change. Keep rendering the ISO code beside the number per
`docs/localization-palestine.md`.

## B5. Locality — a ponytail ceiling that has actually been hit

Craft hiring is hyper-local in a way office hiring is not: a homeowner in Jenin will not
hire a tiler in Rafah, and between Gaza and the West Bank cannot. Cross-region results are
noise, not options.

`packages/shared/src/palestine.ts` says, in its own words: _"Add a `governorate` column only
if governorate-level filtering is ever needed."_ It is now needed — cite that comment when
you close it. Still take the lazier of the two options first: **derive governorate from the
canonical city** through `PS_GOVERNORATES` (`governorateOfCity()`), rank same-governorate
first, and add a real column only if the query planner needs an index on it. Free-text
diaspora cities must degrade to "no governorate", never to a wrong one.

Two booleans belong on the craft profile, not on the job — a customer's first question is
"do you come to me?":

- `servesAtClientSite` — «أزور موقع العميل»
- `hasWorkshop` — «لديّ ورشة»

`JobLocationMode` (ONSITE/HYBRID/REMOTE) needs no new values: for a craft job posted by a
homeowner, ONSITE _is_ the home.

**Self-employment is a missing state.** `Profile` has `openToWork` and `hiring`, both
employment-framed. A self-employed معلّم is permanently taking work, which is not the same
fact as a salaried person job-hunting. Add one boolean — `acceptingWork` («يقبل أعمالاً
الآن») — and leave `openToWork` alone.

**Not modelled, deliberately:** work permits and employment inside Israel or the
settlements. The composition of Palestinian construction employment changed sharply after
2023 and this doc cannot verify current figures without web access; design for domestic
demand and do not build a permit facet. If anyone later wants that market, it needs current
data and its own decision, not an enum value bolted on here.

## B6. Build it from what exists — the lazy shape

**One nullable column unlocks the flow.** `Job.companyId` is required, which is why a person
cannot post "need someone to rewire two rooms in Ramallah". Make it nullable (`postedById`
already carries the human). Then `Application → HIRED →` the existing two-sided `UserRating`
(`CANDIDATE_RATES_EMPLOYER` / `EMPLOYER_RATES_CANDIDATE`) `→ KaramaReason.VERIFIED_HIRE`
all work unchanged, and the ladder has a data source on day one **with no `WorkRecord`
table**. Add one only if the ladder is provably starved, and name that ceiling in a
`ponytail:` comment.

| Need                             | Reuse                                                                                      | Change                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Shop / workshop / kitchen/garage | `Company` — already has verified, city, industry, members, jobs, subscriptions, credits    | `Company.kind`: `EMPLOYER \| SHOP \| WORKSHOP \| KITCHEN \| SOLO`, default `EMPLOYER`                                                           |
| Craft taxonomy                   | `palestine.ts` beside `PS_INDUSTRIES`; `foldArabic`                                        | `PS_CRAFTS` + `normalizeCraft()`. No table                                                                                                      |
| Craft claim on a person          | `Skill` + `ProfileSkill` — endorsements live there and already award Karama                | seed craft skills; **no** parallel `Profile.crafts` array                                                                                       |
| Rank storage                     | —                                                                                          | one row per (user, craft): rank 1–4, attainedAt. Written only on advancement, never recomputed on read — you need the diff for the notification |
| Day/piece/seasonal work          | `Job`                                                                                      | `JobType` +5 values, `payBasis` enum, basis-aware money copy (§B4)                                                                              |
| Work portfolio (photos = the CV) | `Post` + `Media` (R2 signed URLs, blurhash)                                                | `Post.isWorkSample Boolean` — one column, and the portfolio inherits feed distribution, comments and reactions. Ceiling: no reordering          |
| Worker discovery                 | `search` module + its Arabic folding                                                       | `craft` + `governorate` facets, ordered rank → rating → recency                                                                                 |
| Craft listings surface           | the Jobs screen's existing `Tabs` strip                                                    | «الوظائف \| الخدمات» — **no new route tree** on either platform. Split only when the tab earns it                                               |
| Shop page                        | `/[locale]/(app)/company/[slug]`                                                           | header shaped by `kind`; a KITCHEN shows crafts, not a "company size" bucket                                                                    |
| Seasonal re-hiring               | `JobAlert`                                                                                 | nothing — a `SEASONAL` + craft + governorate alert is one saved row                                                                             |
| Rank + confirmation notices      | `NotificationType`                                                                         | `+= CRAFT_RANK_ADVANCED`, `WORK_CONFIRMATION_REQUESTED`                                                                                         |
| Monetization                     | `EmployerCredit.FEATURED_SLOT`, `KaramaReward.BOOST_APPLICATION`, HyperPay + bank transfer | **nothing.** A shop buying a featured slot and a صنايعي boosting an application both ride shipped rails. Zero new billing code                  |

**What this must not become:** no ordering, no cart, no delivery tracking, no in-app payment
for jobs, no escrow. 🍴 means a bakery has a profile and hires a baker — not that anyone
orders manāqīsh through Baydar. Marketplace mechanics are a different product and
`project-spec.md`'s deferred list stays intact.

## B7. Ladder mechanics — thresholds, time, and the cold start

Advancement requires **all** of:

- N confirmed work records **in that craft** (not lifetime total),
- from ≥K **distinct counterparty accounts**, counted only if the counterparty is
  email-verified with a complete profile,
- average rating ≥ threshold over ≥K ratings **from distinct raters**,
- **minimum time in craft** since the first confirmed record — no rung 3 in three months,
- for rank 4: one endorsement from an existing معلّم in the same craft family — the vouch,
- cooldown: at most one rung per 30 days.

**Time-in-craft is not decoration.** Without it, record count favours high-frequency low-skill
work: a day labourer accumulates 200 records a year while a stone mason finishes four large
jobs. Counting distinct counterparties helps; a months-since-first-record floor is what makes
the rungs mean the same thing across families. It is also unfarmable — you cannot buy
elapsed time.

**The cold start is otherwise fatal.** A معلّم with 20 years who joins today and is labelled
متدرّب closes the app and tells his friends. Three seeding paths, in order of trust:

1. **Declared experience** — years and craft, self-reported. Shown as «خبرة معلنة» with no
   rank. Never sets a rank. It is a claim, and the whole feature exists because claims are
   cheap.
2. **Vouching** — one معلّم vouch in the same family grants rank 2 immediately; two
   independent vouches grant rank 3. Rank 4 is never vouched, only earned.
3. **Founding معلّمين** — an admin-granted, capped (≈50–100), fully audited seed set drawn
   from unions, chambers of commerce and known workshops, written through
   `ModerationAction` with a reason and surfaced as «موثّق يدويًا». Without it there is nobody
   to vouch and path 2 is dead on day one. Cap it in code, not in a policy document.

**Vouching needs skin in the game** or it is just a favour economy: if a vouchee's work is
disputed and the dispute upheld, the voucher loses vouch capacity for a fixed window. One
counter, one `ModerationAction` row, and the guild logic works the way guilds actually did.

## B8. Anti-gaming — the part that decides whether this ships

A farmable rank is worse than no rank. This repo has already been burned here: the round-2
review found Karama could be **minted by toggling an application's hire status**
(`docs/audit/OPUS5-ROUND2-2026-07-25.md`). The same attack lands on a rank counter.

- **Two-sided confirmation.** The worker cannot confirm both ends; the client confirms,
  inside a bounded window.
- **Counted once, keyed on the record.** Reuse `awardOnce`'s pattern — the DB unique on
  `(userId, reason, refType, refId)` is the source of truth, not a read-before-write. A hire
  status toggled `HIRED → REJECTED → HIRED` advances nothing the second time.
- **Reversible on dispute.** An upheld report or a reversed confirmation un-counts the
  record. Suspension and demotion go through `ModerationAction` with an audit row — never a
  silent update.
- **No self-dealing.** Reject records where worker and counterparty are the same user, are
  linked by a shared `CompanyMember` row, or where the counterparty account was created
  after the record it is confirming.
- **No purchased rank.** A test that fails if `billing/*` or `karama/*` can reach the rank
  writer.

One runnable check per rule. The ladder's tests _are_ the feature — a green build that lets
two colluding accounts reach معلّم in an afternoon has shipped nothing.

## B9. The onboarding fork — the design work nobody has done

Today's onboarding asks for education and experience. A كهربائي with fifteen years has
neither row, and presented with that form, closes the app. Highest-risk piece of the
expansion, and it is a **design** problem, not a schema one.

- Fork early: «أعمل بحرفة» → craft picker, governorate, years working, work photos —
  instead of degree and employer.
- A profile with no `Education` row must not read as deficient. The empty education section
  is not "missing", it is **absent**. Check the surface variants in `DESIGN.md §5.6` and
  route this through `design-handoff-2026-06/` before building.
- Reuse `OnboardingProgress` (both platforms, already in lockstep). Do not fork it.
- The rank chip and ladder progress need a new shared component — web **and** native in the
  same commit. `check:ui-lockstep`'s ledger reached **0 entries** on 2026-07-30 after three
  sprints stuck at 3. Do not be the PR that puts it back to 1.

## B10. The one genuine new dependency — surfaced now, not in phase 5

Most craft work is arranged by phone and paid in cash. If confirming a record requires the
_customer_ to hold a Baydar account, the ladder starves; if confirmation can be anonymous,
the ladder is farmable in ten minutes. There is no third option that keeps both properties.

**Off-platform confirmation needs phone identity** — an OTP to the customer's number.
`docs/localization-palestine.md` already specifies E.164 with `+970` and names
`libphonenumber-js` "when phone is introduced". That is one new dependency plus **an SMS
sender — an owner-gated credential, like Resend and HyperPay.**

Consequence: phases 1–4 must be useful on **on-platform records only** (posted job →
application → hire → two-sided rating). Phone-confirmed off-platform records are phase 6 and
owner-gated. Do not design a ladder that is inert until an SMS account exists.

## B11. Risks — stated once, then proceed

1. **Trust laundering** is the existential one. §B8 is the answer; if those tests cannot be
   written, do not ship the rank.
2. **Scope.** A second product surface on a codebase that is feature-complete and waiting on
   ops. It does not unblock launch — it changes who launch is _for_. Sequencing it after the
   owner-gated blockers clear is defensible; the phases below are each shippable alone.
3. **Physical safety.** Craft work means entering strangers' homes. Reuse `safety`/`Report`,
   keep the block list authoritative for listings too, and never expose a worker's exact
   address — city granularity only, as today.
4. **Connectivity.** This audience is more phone-only and more offline than the current one.
   The offline banner and SSE resume exist; craft surfaces must meet the same bar, verified
   on device.
5. **Legal.** Peer-earned reputation only. No licence claims, no tax or employment-status
   implications, `معتمد` unused. Counsel already owes a review of `legal-copy.tsx`; this adds
   to that ask rather than waiting on it.
6. **Register.** The reviewer may reject صنايعي as too colloquial for UI chrome under
   `docs/localization-palestine.md`'s فصحى rule. That is why every label is an i18n key from
   commit one and the MSA ladder (متدرّب / حرفي / حرفي ماهر / معلّم حرفة) is written down: the
   swap must be a JSON edit, never a refactor.

## B12. Phases — one PR each, each shippable alone

| Phase | Deliverable                                                                                                                                                                                                                                                                          | Gated on                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 0     | `docs/design/CRAFTS.md`: both label registers + the per-family map, ladder thresholds, screen recipes in `docs/design/SCREENS.md` format, and the §B14 verify-list answered. Plus the `project-spec.md` §Current Feature Surface / §Deferred edits. **No code.**                     | —                              |
| 1     | Taxonomy + contracts: `PS_CRAFTS` (+ISCO keys) + `normalizeCraft`, `Company.kind`, nullable `Job.companyId`, the 5 new `JobType` values + 2 relabels, `payBasis` + basis-aware money copy, `Post.isWorkSample`, `governorateOfCity`, `acceptingWork`, Zod, migration. **No new UI.** | Phase 0                        |
| 2     | Onboarding fork + profile craft section + work-sample posts. Both platforms, lockstep.                                                                                                                                                                                               | Phase 1 + design routing (§B9) |
| 3     | Rank engine on existing HIRED + rating primitives, `CraftLadder` component both platforms, vouching + founding seeds, and the §B8 test suite.                                                                                                                                        | Phase 2                        |
| 4     | Discovery: services tab facet, craft + governorate search facets, shop page shaping by `kind`, seasonal `JobAlert` copy.                                                                                                                                                             | Phase 3                        |
| 5     | Service-request composer — a person posts a `PIECE_WORK`/`DAY_LABOR` job with no company — plus the two new notification types.                                                                                                                                                      | Phase 4                        |
| 6     | Phone-OTP confirmation of off-platform records.                                                                                                                                                                                                                                      | **Owner** — SMS credential     |

Definition of done per phase is `project-spec.md` §Definition of Done, unchanged: migration
committed, Zod updated, API tests on the happy path and the failure paths that matter, web or
mobile smoke evidence proportional to risk, `ar` keys first with `en` fallback, the six
commands green, docs updated in the same change.

## B13. Hard borders

`CLAUDE.md` is law and none of it bends for a new surface: tokens only — no hex, rem or px;
RTL-safe logical properties only; Arabic authored first; web ↔ mobile lockstep in the same
commit; `ui-*` stays framework-neutral; no public cache on any DTO carrying viewer state
(rank progress is viewer-scoped → private/no-store); no placeholder production routes; SSE
stays the realtime transport; digit-script policy lives only in `@baydar/shared`; design work
routes through `design-handoff-2026-06/`. Do not recreate LinkedIn — and note LinkedIn has
no answer at all for this audience, so there is nothing here to copy.

## B14. Verify before phase 1 — the citation list this doc owes

Web research was unavailable when this was written (§B2). Phase 0 must close these. Each is
cheap with either working web tools or one conversation with a Palestinian tradesperson.

1. **Register of صنايعي and معلّم** in Palestinian usage, and whether a native reviewer
   accepts them in UI chrome given the فصحى rule. → the ARABIC-REGISTER reviewer.
2. **The per-family override wording** in §B2 (فني أول، رئيس طهاة، معلّم خياطة) — ⚠️ medium
   confidence, most likely thing in this doc to be wrong.
3. **ISCO-08 Arabic group names** against the official ILO Arabic translation. Group numbers
   are high confidence; the Arabic is not.
4. **Palestinian TVET / national qualifications levels** — if there is a recognized
   وزارة العمل or PQF skill ladder, align the four rungs to it and let a real
   شهادة مهنية count as evidence toward a rank. This is the strongest legitimacy path
   available and it may already exist.
5. **The craft family list** — confirm nothing large is missing before keys freeze.
   Keys are forever; Arabic labels are a JSON edit.
6. **Current construction-labour composition** (§B5) — needed only if someone wants to
   revisit the permit decision. Do not act on 2023-era assumptions.
