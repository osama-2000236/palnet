# MATCHING.md — job matching and applicant intelligence

Decision record for both sides of the hiring surface: how a member finds and applies for work
efficiently, and how the person hiring understands who applied. Companions:
[`OCCUPATIONS.md`](OCCUPATIONS.md) (the naming spine and the evidence primitive) and
[`FEED-RANKING.md`](FEED-RANKING.md) (the same interest model). Written 2026-07-30.

## 0. What exists today, exactly

- `Job` carries `title, description, type, locationMode, city, salaryMin/Max, skillsRequired
String[]` — the requirements are **free text in an array**, so nothing can be matched
  against them reliably.
- `jobs.service.ts` filters on `q, city, type, locationMode, companyId, industry` with a folded
  substring prefilter. Keyword search, no notion of fit.
- `Application` is **`resumeUrl`, `coverLetter`, `status`**. That is the entire structured
  content of an application.
- `JobAlert` already exists and notifies on matching new jobs.

So a seeker cannot tell which of forty jobs is worth their afternoon, and an employer holding
sixty applications has sixty PDFs and no way in. Both problems are the same missing thing:
**structure on the requirement side.**

## 1. One model, two directions

```
MatchScore(job, member) → { total, components[], matched[], missing[], extra[] }
```

The same function serves both surfaces. The seeker sees it as "does this fit me"; the employer
sees it as "does this person fit the role". Symmetry is deliberate — see §5.

**Never a bare number.** A score with no decomposition is unaccountable to both sides, and a
score nobody can contest is a score nobody should trust.

## 2. Structure the requirement side first

Nothing downstream works without this. `Job` gains:

| Field                                | Why                                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `occupationKey`                      | the one occupation this job is for, from `PS_OCCUPATIONS` — the join key for everything else                                |
| `minStanding` (1–4, `CRAFT` only)    | «مطلوب معلّم بلاط» is a real requirement and today it is prose                                                              |
| `requiresLicence` + `licenceBodyKey` | an audit engagement needs a licensed مدقق. Matching an unlicensed accountant to it is a correctness bug, not a ranking miss |
| `skillsRequired` (**kept**)          | stays free text for the long tail, but is no longer load-bearing                                                            |
| `requirementLevel` per skill         | `MUST` \| `NICE` — without it every requirement is a knockout and nobody qualifies                                          |
| `payBasis` + range                   | already decided in `OCCUPATIONS.md`; a monthly-salary seeker and a per-piece job are a mismatch worth surfacing             |
| `startsAt`, `durationDays`           | day and seasonal work has an actual date; "when" is half of whether a seeker can take it                                    |

## 3. The seeker side — applying efficiently

**Score components**, each 0–1, weighted, all explainable:

```
0.30 occupation   exact key 1.0 · same family 0.6 · unrelated 0.0
0.20 standing     meets minStanding 1.0 · one rung below 0.5 · LICENSED: verified licence 1.0, declared 0.4, none 0.0
0.20 proximity    same governorate 1.0 · adjacent 0.6 · same region 0.3 · across the divide 0.0
0.15 skills       share of MUST skills covered, folded-Arabic matched; NICE skills add at 1/3 weight
0.10 pay          overlap of the seeker's expected range with the job's, in the same payBasis
0.05 availability startsAt within the seeker's stated availability
```

- **`MUST` coverage below 100% is shown, not hidden.** «ينقصك: رخصة مزاولة» is more useful than
  a 62% and lets the seeker skip the application instead of wasting a day.
- **Proximity across the Gaza–West Bank divide is 0, not low.** A job someone cannot physically
  reach is not a weak match; it is not a match. `FEED-RANKING.md` §6's governorate logic and
  this share one helper.
- **The gap list is a product, not an error message.** «ناقص: مستوى صنايعي ماهر — تحتاج ٤
  إثباتات عمل أخرى» is a path, and it points at `OCCUPATIONS.md` §3's thresholds.

**Apply in one step.** An `ApplicationProfile` is derived from the profile the member already
filled — occupation claims, standing, licence, `WorkProof` set, portfolio posts, governorate,
expected pay, availability. The apply action confirms and edits that; it never asks the member
to retype what Baydar already knows. Cover letter stays optional, because for a صنايعي it is a
barrier and for a محاسب it is a differentiator.

**Saved searches** are the existing `JobAlert` plus `minMatchScore`, so the notification is
"three jobs above 70% for you", not "sixty new jobs".

## 4. The employer side — knowing the applicant

`Application` gains structure, and each field exists because an employer currently reconstructs
it by reading PDFs:

| Field                              | Replaces                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `screeningAnswers` (job-defined)   | the questions employers put in the JD and hope get answered                                      |
| `expectedPay` + `payBasis`         | the awkward first call                                                                           |
| `availableFrom`                    | "when can you start" as a third message                                                          |
| `attachedProofIds` → `WorkProof[]` | "trust me, I did this"                                                                           |
| `portfolioPostIds` → work samples  | photos over prose, which is how trades hire                                                      |
| `matchSnapshot`                    | the score **as computed at submission**, frozen — so a later profile edit cannot rewrite history |

**`ApplicantSummary`**, one row per application in the employer's list:

- match total plus its components, expandable,
- `Standing` or `Licence` with verification state,
- `WorkProof` count in the job's occupation, and the rating average with its count,
- governorate and travel feasibility,
- availability and expected pay against the job's range,
- **flags, stated plainly:** «رخصة منتهية», «لا توجد إثباتات عمل», «لم يجب على سؤال إقصائي».

**Ranked list, capped compare.** Default order is match score, always with a visible
"reason" column and a one-click switch to newest-first — an employer who distrusts the ranking
must be able to leave it. Compare view holds **at most 3** side by side; a spreadsheet of
sixty is how bias hides in aggregate.

**Knockout questions must be disclosed before the application is written**, labelled
«سؤال إقصائي». Filtering people is legitimate; wasting their afternoon first is not.

## 5. Fairness — the rules that do not bend

The score decides order, never outcome. A human always decides.

**Never inputs to any score:** gender, age or date of birth, photo, family name, marital status,
refugee or camp status, place of residence beyond travel feasibility, university prestige,
nationality, or health. Not as a feature, not as a proxy, not "temporarily for testing".

- **Every component is visible to both sides.** The applicant can see their own score and its
  reasons for a job they applied to — the same numbers the employer sees. Asymmetric scoring is
  how a black box survives.
- **No auto-rejection.** Baydar never sets `REJECTED` on a score. Knockouts filter the _list_,
  and the applicant is told they were filtered and why.
- **No silent re-ranking of a submitted application.** `matchSnapshot` freezes at submission.
- **Auditable:** every score is reproducible from `(jobId, applicationId, weights version)`.
  Store the weights version on the snapshot, or a tuning change silently rewrites past
  decisions.
- **A test asserts the banned inputs are absent** from the scoring function's input type. The
  type is the enforcement point; a comment is not.

## 6. Search — from keyword to structured, without losing keyword

`jobs.service.ts`'s folded substring filter stays; it is the filter-as-you-type box and it works.
Added alongside, not instead:

- facets: `occupation`, `family`, `governorate`, `payBasis`, `minStanding`, `requiresLicence`,
  `type` (including the five new engagement values), `startsAt` window,
- sort: match score · newest · pay,
- «وظائف تناسبك» — the seeker's own high-score jobs, which is the interest model from
  `FEED-RANKING.md` applied to `Job` instead of `Post`. One model, two surfaces; the occupation
  weights are already there.
- the folded prefilter's `ponytail:` comment already names its seq-scan ceiling. Structured
  facets are indexed columns, so they do not inherit that ceiling.

## 7. Screen recipes

Format per `docs/design/SCREENS.md`. i18n namespace: `matching`.

| Screen           | Web route                    | Mobile route                      | Recipe                                                                                   | Required states                                                        |
| ---------------- | ---------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Jobs list        | `/jobs`                      | `(app)/jobs/index`                | structured facet chips, match badge per row, sort switch                                 | loading, no results in governorate, unscored (no claim yet), offline   |
| Job detail       | `/jobs/[id]`                 | `(app)/jobs/[id]`                 | «يطابقك» / «ناقص» / «إضافي» blocks above the description; one apply action               | already applied, missing MUST, expired, closed, unscored               |
| Apply            | `/jobs/[id]/apply`           | `(app)/jobs/[id]/apply`           | profile-derived summary to confirm, screening questions, proof and portfolio picker      | validation, knockout answered out, submitting, submitted, rate-limited |
| Applicants list  | `/employer/[slug]/jobs/[id]` | `(app)/employer/[slug]/jobs/[id]` | ranked rows with reason column, sort switch, flags, select-to-compare                    | empty, all filtered out by knockout, loading, single applicant         |
| Applicant detail | same route, sheet            | `Sheet`                           | frozen `matchSnapshot` with components, proofs, portfolio, licence state, status actions | expired licence, no proofs, withdrawn, hired elsewhere                 |
| Compare          | sheet, max 3                 | `Sheet`, max 3                    | aligned component rows — never a scrollable grid of everyone                             | 2 selected, 3 selected, one withdrew mid-compare                       |
| Saved search     | `/jobs` sheet                | `(app)/jobs` sheet                | existing `JobAlert` fields + `minMatchScore`                                             | no filters chosen, saved, quota reached                                |

## 8. Phasing

| Step | Ships                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| M1   | `Job` structure (`occupationKey`, `minStanding`, `requiresLicence`, `requirementLevel`, dates) + the employer form. No scoring |
| M2   | `MatchScore` in `@baydar/shared` as a pure function with a unit-test table, plus the banned-input type test                    |
| M3   | Seeker surfaces: match badge, the three blocks on job detail, structured facets                                                |
| M4   | `Application` structure + one-step apply from the derived profile                                                              |
| M5   | Employer surfaces: ranked list with reasons, flags, compare, `matchSnapshot`                                                   |
| M6   | «وظائف تناسبك» from `InterestWeight`, and `JobAlert.minMatchScore`                                                             |

M1 and M2 are the load-bearing ones: a pure scoring function with a test table can be tuned and
argued about before a single screen changes. M2 depends on nothing but `@baydar/shared`.
