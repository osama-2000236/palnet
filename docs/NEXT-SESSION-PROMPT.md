# NEXT-SESSION-PROMPT — leftovers + the crafts expansion

Written 2026-07-30 against `main` @ `c8248a7`. Rewritten in place, not appended to.
Paste **Part A** or **Part B** (not both) into a fresh session. They are two different
kinds of work and mixing them in one session produces a bundled commit, which
`CLAUDE.md` forbids.

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
> type-check and test, plus the gate that covers what you
> touched (`check:i18n`, `check:ui-lockstep`, `check:native-versions`, `test:gates`,
> `check:security-headers`, `check:release-production`). On a fresh clone run
> `pnpm --filter @baydar/db db:generate` before `type-check` or `test`, or the whole gate
> fails on a misleading `TS2305`.

### Actionable now — no owner, no credential

| #   | Item                                     | Where                                                       | Notes                                                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Prisma 7**                             | `packages/db`                                               | Prisma 7 rejects `datasource.url` in the schema. Needs `prisma.config.ts` + a driver adapter — a rewire of the production DB connection. Own PR, staging soak, no other change riding along.                                                                                                                                                                        |
| 2   | **Mobile screenshots are viewport-only** | `apps/mobile/e2e/shots.mjs`                                 | The harness cannot scroll, so `me/edit` and `settings/notifications` have never been reviewed below the fold. Either teach it to scroll-and-stitch or make it capture N viewports per screen.                                                                                                                                                                       |
| 3   | **Mobile console capture is blind**      | same harness                                                | `logcat` carries no `ReactNativeJS` on this stack. The harness says so loudly instead of writing `{}`; fix it or document the working channel.                                                                                                                                                                                                                      |
| 4   | **The dev-client bundle redbox**         | `docs/audit/VISION-QA-2026-07-29.md` §"Not fixed, recorded" | `Compiling JS failed: <line>:<col>` that moves between attempts on a bundle `hermesc -emit-binary` compiles with exit 0. Transport or on-disk corruption of a ~16 MB bundle. Next things to try: a release/embedded build, a physical device, a smaller bundle. Cheap first check is in that doc — thirty seconds, and it tells you whether to look at code at all. |
| 5   | **`ponytail:` debt ledger**              | 20 markers across 17 files                                  | Run `/ponytail-debt`. Most are correct-as-written; convert the ones whose named ceiling has actually been hit. Do not "clean up" the rest.                                                                                                                                                                                                                          |

### Blocked upstream — verified against the packages, do not retry

- **Jest 30** — `jest-expo@57`, latest, still depends on the Jest 29 toolchain. Not gated on the Expo upgrade.
- **ESLint 10** — `eslint-plugin-import`, latest, caps at 9.
- **Expo 54 → 57** — needs the physical-device smoke run. Do not ship it on emulator evidence, and note item 4 above blocks the emulator anyway.

### Owner-gated — do not attempt, do not stub

Every row needs an account, a credential, or a human. Full table with evidence lines in
`docs/HANDOFF.md` §"Launch blockers". Summary: production env vars (`CORS_ORIGINS`,
`BAYDAR_WEB_URL`, `INTERNAL_CRON_TOKEN`), Resend, HyperPay merchant onboarding, bank IBAN,
the two scanner URLs, Sentry, Apple/Play identifiers, EAS credentials, the real staging
hostname, physical-device smoke evidence, the 47-string Arabic register review
(`docs/audit/ARABIC-REGISTER-2026-07-25.md`), and counsel review of
`legal-copy.tsx` (still v0.1 placeholder, three paragraphs per page).

If a leftover you want to do turns out to need one of these, stop and say so. Do not
fabricate a value to get a green run.

---

# Part B — the crafts expansion (صنعة)

This is a product change, not a cleanup. Read the whole part before writing code.

## B0. Why — the target audience is wrong today

Baydar today models one worker: salaried, CV-shaped, NGO/tech/finance, a degree row and an
employer row. `PS_INDUSTRIES` leads with NGOs because they are the largest _formal_
employers. But the majority of Palestinian working people are not in that set. They are
electricians, builders, tilers, welders, aluminium fitters, plumbers, painters, car
mechanics, bakers, cooks, tailors, barbers, phone-repair techs, farmers, drivers — mostly
informal, mostly hired by word of mouth, mostly with no CV and no LinkedIn account and no
intention of making one.

For that worker the professional network's job is not "showcase your résumé". It is
**carry your reputation between customers**, because right now their reputation lives only
in the head of whoever last hired them and dies when they move city.

This is the strongest fit Baydar has with its own name. البيدر is where you bring what you
harvested to be **measured** in public. A CV is a claim. A record of finished work
confirmed by the people who paid for it is a measurement.

## B1. The idea, stated precisely

Two additions, one mechanic:

1. **Crafts and shops become first-class**, alongside jobs and companies — a workshop, a
   bakery, a car-repair garage, a small retail shop, a home kitchen are all businesses on
   Baydar, and craft work is a listing type.
2. **A craft ladder**: every craft worker has an earned rank, per craft, visible on their
   profile and sortable in search. The ladder is climbed **only** by finished work that a
   counterparty confirmed — not by activity, not by posting, not by paying.

### The rank is a credential, not a currency

Baydar already has Karama (`KaramaLedger`, `KARAMA_EARN`, `KaramaService`) — points that
are earned by activity, **spendable** on boosts and premium, **capped** at 5000, and
**decay** 1%/month on inactivity. The craft rank must be its opposite on every axis:

|             | Karama (exists)                        | Craft rank (new)                                            |
| ----------- | -------------------------------------- | ----------------------------------------------------------- |
| Earned by   | activity, endorsements, hires, ratings | confirmed finished work, only                               |
| Spendable   | yes                                    | never                                                       |
| Purchasable | effectively yes (premium ↔ points)     | **never** — no billing or Karama code path may write a rank |
| Decays      | yes, on inactivity                     | no — a skill you had, you had                               |
| Reversible  | via `ADJUSTMENT`                       | only by dispute or moderation, with an audit row            |

Conflating the two kills the feature: the moment rank can be bought, Baydar is selling
trust, and a homeowner choosing an electrician from this app learns that the hard way.
Write a test that fails if `billing/*` or `karama/*` can reach the rank writer.

### The ladder — four tiers, not seven

The market's own vocabulary is the trade hierarchy: متدرّب → صانع → أسطى → معلّم. That is
what a كهربائي in Nablus actually calls himself, and it needs no glossary.

**Register conflict, flag it, do not silently resolve it:** `docs/localization-palestine.md`
says UI copy is فصحى عصرية and dialect belongs in user content only. أسطى (from Turkish
_usta_) and معلّم in this sense are colloquial. Carry both ladders into the Phase 0 doc and
route the choice to the native-speaker reviewer who already owns
`docs/audit/ARABIC-REGISTER-2026-07-25.md`:

- Market register: **متدرّب / صانع / أسطى / معلّم**
- MSA register: **متدرّب / حرفي / حرفي متقدّم / معلّم حرفة**

My recommendation: market register, on the grounds that these are _domain terms_ like job
titles, not UI chrome — but it is the reviewer's call, and the tier names must be i18n keys
from the first commit so the swap is a JSON edit.

Never use **معتمد** (certified) anywhere near this. Baydar does not license tradespeople.
**موثّق** stays reserved for identity verification. Copy that implies a licence is a legal
problem, not a wording problem.

## B2. Build it out of what exists — the lazy shape

Read this before designing anything. Most of the expansion is already in the schema.

**One nullable column unlocks the whole flow.** `Job.companyId` is required, which is why
an individual cannot post "need someone to rewire two rooms in Ramallah". Make it nullable
(`postedById` already exists and is the human). Then `Application` → `HIRED` → the existing
two-sided `UserRating` (`CANDIDATE_RATES_EMPLOYER` / `EMPLOYER_RATES_CANDIDATE`) →
`KaramaReason.VERIFIED_HIRE` all work unchanged, and the ladder has a data source on day
one without a new `WorkRecord` table. Add `WorkRecord` **only** if the ladder is provably
starved of records, and say so in a `ponytail:` comment naming that ceiling.

| Need                                 | Reuse                                                                                                | Change                                                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shop / workshop / kitchen / garage   | `Company` — it already has verified, city, industry, members, jobs, subscriptions, invoices, credits | add `Company.kind` enum: `EMPLOYER \| SHOP \| WORKSHOP \| KITCHEN \| SOLO`, default `EMPLOYER`                                                                                                  |
| Craft taxonomy                       | `packages/shared/src/palestine.ts` next to `PS_INDUSTRIES`                                           | `PS_CRAFTS`, canonical Arabic stored, grouped by family. Plain constants, **no DB table** — same reasoning as `PS_CITIES`. Add `normalizeCraft()` on `foldArabic`, exactly like `normalizeCity` |
| Craft claim on a person              | `Skill` + `ProfileSkill` — endorsements already live there and already award Karama                  | seed craft skills; do not add a parallel `Profile.crafts` array                                                                                                                                 |
| Day/piece work listings              | `Job`                                                                                                | `JobType` += `DAY_WORK`; `payBasis` enum `MONTHLY \| DAILY \| HOURLY \| PER_JOB` defaulting `MONTHLY` so existing rows are untouched. `salaryMin/Max` keep their meaning under the new basis    |
| Work portfolio ("photos are the CV") | `Post` + `Media` (R2 signed URLs, blurhash)                                                          | `Post.isWorkSample Boolean` — one column, and the portfolio gets feed distribution, comments and reactions free. Ceiling: no ordering/curation; add a join table only if members ask to reorder |
| Worker discovery                     | `search` module + its Arabic folding                                                                 | `craft` + `city` facets, ordered rank → rating → recency                                                                                                                                        |
| Craft listings surface               | the existing Jobs screen's `Tabs` strip                                                              | `الوظائف \| الخدمات` — **no new route tree** on either platform. Split into its own route only when the tab earns it                                                                            |
| Shop page                            | `/[locale]/(app)/company/[slug]`                                                                     | header shaped by `kind`; a KITCHEN shows its crafts, not a "company size" bucket                                                                                                                |
| Ranks in notifications               | `NotificationType`                                                                                   | += `CRAFT_RANK_ADVANCED`, `WORK_CONFIRMATION_REQUESTED`                                                                                                                                         |
| Monetization                         | `EmployerCredit.FEATURED_SLOT`, `KaramaReward.BOOST_APPLICATION`, HyperPay + bank transfer           | **nothing.** A shop buying a featured slot and a صانع boosting an application both ride rails that already ship. This expansion needs zero new billing code                                     |

**What Baydar is not, and this expansion must not become:** no ordering, no cart, no
delivery tracking, no in-app payment for jobs, no escrow. 🍴 means a bakery has a profile
and hires a baker — not that anyone orders manāqīsh through Baydar. Marketplace mechanics
are a different product and `project-spec.md`'s deferred list stays intact.

## B3. Anti-gaming — the part that decides whether this ships

A farmable rank is worse than no rank. The repo has already been burned here: the round-2
review found Karama could be **minted by toggling an application's hire status**
(`docs/audit/OPUS5-ROUND2-2026-07-25.md`). The same attack applies directly to a rank
counter, so design against it from the first commit.

Advancement requires **all** of:

- N confirmed work records in **that craft** (not lifetime total),
- from ≥K **distinct counterparty accounts**, where a counterparty is only counted if its
  account is email-verified and its profile complete,
- average rating ≥ threshold over ≥K ratings **from distinct raters**,
- for أسطى and معلّم: one endorsement from an existing معلّم in the same craft — the
  vouch. Culturally real, and much harder to farm than a rating.
- cooldown: at most one level per 30 days.

Non-negotiable invariants:

- **Two-sided confirmation.** The worker cannot confirm both ends. The client confirms, in
  a bounded window.
- **Counted once, keyed on the record.** Reuse `awardOnce`'s pattern — the DB unique on
  `(userId, reason, refType, refId)` is the source of truth, not a read-before-write. A
  hire status toggled `HIRED → REJECTED → HIRED` must advance nothing the second time.
- **Reversible on dispute.** An upheld report or a reversed confirmation un-counts the
  record. Rank suspension and demotion go through `ModerationAction` with an audit row —
  never a silent update.
- **No self-dealing.** Reject records where worker and counterparty are the same user, are
  connected via the same `CompanyMember` row, or where the counterparty account was created
  after the work record it is confirming.

One runnable check per rule. The ladder's tests are the feature — a green build that lets
two colluding accounts reach معلّم in an afternoon has shipped nothing.

## B4. The onboarding fork — the design work nobody has done

Today's onboarding asks for education and experience. A كهربائي with fifteen years has
neither row and, presented with that form, closes the app. This is the single highest-risk
piece of the expansion and it is a **design** problem, not a schema problem.

- Onboarding forks early: «أعمل بصنعة» → craft picker, city, years working, and work
  photos — instead of degree and employer.
- A profile with no `Education` row must not read as deficient. The empty education section
  is not "missing", it is **absent**. Check the surface variants in `DESIGN.md §5.6` and
  route this through `design-handoff-2026-06/` before building it.
- Reuse `OnboardingProgress` (both platforms, already in lockstep). Do not fork it.
- The rank chip and the ladder progress need a new shared component — web **and** native in
  the same commit. `check:ui-lockstep`'s ledger reached **0 entries** on 2026-07-30 after
  three sprints stuck at 3. Do not be the PR that puts it back to 1.

## B5. The one genuine new dependency — surface it early, do not discover it in phase 5

Most craft work is arranged by phone and paid in cash. If confirming a work record requires
the _customer_ to have a Baydar account, the ladder starves. If confirmation can be
anonymous, the ladder is farmable in ten minutes. There is no third option that keeps both
properties, so:

**Off-platform work confirmation needs phone identity** — an OTP to the customer's number.
`docs/localization-palestine.md` already specifies E.164 with `+970` and names
`libphonenumber-js` "when phone is introduced". That means one new dependency and, more
importantly, **an SMS sender — an owner-gated credential like Resend and HyperPay.**

Consequence for planning: phases 1–4 must be useful with **on-platform records only**
(posted job → application → hire → two-sided rating). Phone-confirmed off-platform records
are Phase 6 and owner-gated. Do not design a ladder that is inert until an SMS account
exists.

## B6. Risks — stated once, then proceed

1. **Trust laundering** is the existential one. §B3 is the answer; if the anti-gaming tests
   cannot be written, do not ship the rank.
2. **Scope.** This is a second product surface on a codebase that is feature-complete and
   waiting on ops. It does not unblock launch — it changes who launch is _for_. Reasonable
   to sequence after the owner-gated launch blockers clear; the owner decides, and the
   phasing below makes each phase shippable alone.
3. **Physical safety.** Craft work means going to a stranger's home. Reuse `safety`/`Report`
   primitives, keep the block list authoritative for listings too, and never expose a
   worker's exact address — city granularity only, same as today.
4. **Connectivity.** This audience is more phone-only and more offline than the current one.
   The offline banner and SSE resume already exist; the craft surfaces must degrade to the
   same standard, verified on device.
5. **Legal.** Peer-earned reputation only. No licence claims, no tax or employment-status
   implications, `معتمد` stays unused. Counsel already owes a review of `legal-copy.tsx`;
   this expansion adds to that ask rather than waiting on it.

## B7. Phases — one PR each, each shippable alone

| Phase | Deliverable                                                                                                                                                                                                                | Gated on                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 0     | Decision doc `docs/design/CRAFTS.md` (tier names both registers, ladder thresholds, screen recipes per `docs/design/SCREENS.md` format) + the `project-spec.md` §Current Feature Surface and §Deferred edits. **No code.** | —                              |
| 1     | Schema + contracts: `Company.kind`, nullable `Job.companyId`, `JobType.DAY_WORK`, `payBasis`, `Post.isWorkSample`, `PS_CRAFTS` + `normalizeCraft`, Zod schemas, migration. **No UI.**                                      | Phase 0                        |
| 2     | Onboarding fork + profile craft section + work-sample posts. Both platforms, lockstep.                                                                                                                                     | Phase 1 + design routing (§B4) |
| 3     | Rank engine on existing HIRED + rating primitives, `CraftLadder` component both platforms, and the §B3 test suite.                                                                                                         | Phase 2                        |
| 4     | Discovery: jobs tab facet, search facets, shop page shaping by `kind`.                                                                                                                                                     | Phase 3                        |
| 5     | Service request composer — an individual posts a `DAY_WORK` job with no company — plus the two new notification types.                                                                                                     | Phase 4                        |
| 6     | Phone-OTP confirmation of off-platform work records.                                                                                                                                                                       | **Owner** — SMS credential     |

Definition of done per phase is `project-spec.md` §Definition of Done, unchanged: migration
committed, Zod updated, API tests on happy path and the failure paths that matter, web or
mobile smoke evidence proportional to risk, `ar` keys first with `en` fallback, the six
commands green, docs updated in the same change.

## B8. Hard borders, restated because this phase will tempt you to cross them

`CLAUDE.md` is law and none of it bends for a new surface: tokens only — no hex, rem or px;
RTL-safe logical properties only; Arabic authored first; web ↔ mobile lockstep in the same
commit; `ui-*` stays framework-neutral; no public cache on any DTO carrying viewer state
(rank progress is viewer-scoped — private/no-store); no placeholder production routes; SSE
stays the realtime transport; digit-script policy lives only in `@baydar/shared`; design
work routes through `design-handoff-2026-06/`. Do not recreate LinkedIn — and note that
LinkedIn has no answer at all for this audience, so there is nothing here to copy.
