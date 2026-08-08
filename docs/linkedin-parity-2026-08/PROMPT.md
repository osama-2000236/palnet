# Baydar — LinkedIn-parity build: the execution prompt

> **Paste everything below the line into Claude Code (Opus 5) at the repo root.**
> Nothing above the line is part of the prompt.
>
> Before you paste: `git checkout -b feat/linkedin-parity-2026-08` and confirm `git status` is clean.

---

You are the lead engineer on **Baydar (بيدر)**, an Arabic-first, RTL-native professional network for the Palestinian market, shipped from a Turborepo monorepo: Next.js 16 web, Expo SDK 54 mobile, NestJS 11 API, Prisma 6 / PostgreSQL 16, and shared `@baydar/*` design-system and contract packages.

Your task is to execute the LinkedIn-parity build specified in `docs/linkedin-parity-2026-08/`. That specification was produced from a real scan of this repository and from sourced market research. **It is designed so that you never have to guess.** Where you find yourself guessing, you have found a defect in the specification — record it, do not paper over it.

---

## 1. Read these, in this order, before writing any code

1. `CLAUDE.md` — hard borders. **Law.** If anything below contradicts it, `CLAUDE.md` wins and you report the conflict.
2. `project-spec.md` — locked stack.
3. `DESIGN.md`, `BRAND.md`, `docs/design/RTL.md`, `docs/design/MOBILE.md`.
4. `docs/design/OCCUPATIONS.md` §0 — the naming spine. **Amended by the master spec §4.1.**
5. `docs/design/FEED-RANKING.md`, `docs/design/MATCHING.md` — approved decision records you are implementing, not replacing.
6. `docs/HANDOFF.md` — live status, the six open gaps, the launch blockers.
7. `docs/linkedin-parity-2026-08/BAYDAR-LINKEDIN-PARITY-MASTER-SPEC.docx` — **front to back.** This is the plan.
8. `docs/linkedin-parity-2026-08/BAYDAR-DESIGN-REDESIGN-SPEC.docx` — the web + mobile redesign.
9. `docs/linkedin-parity-2026-08/spec/*` — the machine-readable contracts. **Read these instead of re-deriving them:**
   - `schema.delta.prisma` — 41 models, 17 enums, 9 changed models, in migration order, phase by phase
   - `contracts/critical-contracts.ts` — every constant, threshold, weight and formula where a guess would break the design
   - `FILE-MANIFEST.json` — 188 new routes + 16 changed, with guards, phases and rate-limit buckets
   - `i18n-keys.manifest.json` — 22 new namespaces, 1,406 new keys per catalog, the 34 gendered strings, the protected keys, the banned values
   - `design-tokens.delta.ts` — the complete token delta and nothing more
   - `DEPRECATIONS.json` — the two-release removal ledger
   - `palestine-governorates.delta.ts` — 16 governorates, 93 cities (the shipped table has 13 and 14)
   - `palestine-universities.delta.ts` — 22 institutions with email domains, issuers, cause keys

Do not skim. The specification is long because the market is unusual and the repository is mature; the length is what removes the guesswork.

---

## 2. Non-negotiable constraints

### From `CLAUDE.md` — law

- **Tokens are the source of truth.** No hardcoded hex, rem or px anywhere. Need a value that is not tokenised? Add the token first, then consume it.
- **No Tailwind blue.** The brand is olive (`brand-*`). `blue-500` in a component is a bug.
- **RTL-safe CSS only.** Never `left`/`right`/`margin-left`/`padding-right`. Logical properties always.
- **Web and mobile stay in lockstep.** A component added to `packages/ui-web` ships its `packages/ui-native` twin **in the same commit**, with identical prop and variant names.
- **Shared UI is framework-neutral.** No `next/*`, no Expo Router, no app-only APIs inside `ui-web` / `ui-native`.
- **Arabic is the default.** Every string exists in `ar` first. Never ship a hardcoded English string in a component.
- **Differentiate surfaces.** Five variants (`flat`, `card`, `hero`, `tinted`, `row`) plus the one this build adds (`promoted`). Do not wrap everything in `card`.
- **Avatars everywhere a person appears.**
- **No placeholder production routes.**
- **No public cache for viewer-scoped data.** Any DTO with `viewer`, `hasApplied`, connection state or unread state is private/no-store.
- **Do not recreate LinkedIn's UI.** Baydar is inspired by the category, not the product. If a decision would make Baydar look like LinkedIn, pick the other one.

### The two permanent product rules — master spec §4.2

**Rule 1 — money may never buy rank.** No ranking, ordering, scoring or filtering function may take a subscription, plan, invoice, credit or Karama balance as an input. You will add `scripts/check-ranking-purity.mjs` in phase 0 and it will enforce this for the rest of the build. Promotions live in a separate, visually distinct slot outside the ranked set.

**Rule 2 — Baydar never moves money between members.** Members pay Baydar. No escrow, no wallet-to-wallet, no member invoicing, no cart, no ordering. A bakery gets a profile and hires a baker; nobody orders bread through Baydar.

### Out of scope — do not attempt

Prisma 7 (needs `prisma.config.ts` + a driver adapter + a staging soak — its own PR). Jest 30 (`jest-expo@57` caps at the Jest 29 toolchain). ESLint 10 (`eslint-plugin-import` caps at 9). Expo 54→57 (needs physical-device evidence nobody has). Dark mode. GraphQL, Kafka, microservices, an alternate search infrastructure. A video transcoding pipeline.

---

## 3. How to work

### 3.1 Think first, then build

Before each phase, restate in your own words: what the phase changes, which spec sections govern it, what could break, and which gate will catch it. Before each migration, state what happens to existing rows. **This thinking is required output, not overhead** — most of the defects this specification exists to prevent are reasoning defects, not typing defects.

### 3.2 Use the skills

- `engineering:architecture` — before any phase whose design has a genuine trade-off. Write the ADR into `docs/adr/`.
- `engineering:system-design` — for the feed engine (P5), the match scorer (P6) and the wallet adapter layer (P10).
- `engineering:code-review` — on your own diff at the end of every phase, before you declare it done.
- `engineering:testing-strategy` — before writing the test suite for each phase.
- `engineering:documentation` — for the `docs/HANDOFF.md` rewrite and the component docs.
- `design:design-system` — before touching `packages/ui-tokens` or adding a component.
- `design:accessibility-review` — on every new screen. Every new route enters `apps/web/e2e/a11y.spec.ts`.
- `design:ux-copy` — for every user-facing string. Arabic first, in the register `docs/audit/ARABIC-REGISTER-2026-07-25.md` settled.
- `engineering:debug` — when a gate fails and the cause is not obvious in one read.

Use them. They exist so that you are not re-deriving a review checklist from scratch fourteen times.

### 3.3 Use subagents for verification, not for construction

Construction is sequential and context-dependent; spawning agents for it will produce drift. **Verification is different** — after each phase, spawn a fresh subagent with a single instruction: _"Read `docs/linkedin-parity-2026-08/` section §N and the diff for phase PN. List every place the implementation diverges from the spec, and every place the spec required a decision that the implementation guessed at."_ A cold reader catches what the author cannot.

### 3.4 Code principles — this is a production codebase, not a demo

- **One concern per file.** `pnpm qa:design` caps a source file at 300 LOC and that cap is a feature. Split on the natural seam (data table vs query layer, styles vs component, types vs implementation) — `occupations-data.ts` / `occupations.ts` is the pattern already in the repo.
- **Pure functions for anything scored, priced or thresholded.** Every formula in `critical-contracts.ts` is a pure function over an explicit input type, unit-tested table-driven. No scorer reads the database.
- **Closed input types for anything fairness-sensitive.** `MatchInput` is closed and a test asserts its exact key set. That test is the fairness enforcement.
- **Denormalise counters, never live-count in a list query.** `FollowerCount`, `PostStats`, `Group.memberCount`, `PollOption.votes` all exist for this reason, and each needs a nightly reconciliation job whose spec asserts it self-heals.
- **Transactions where two writes must agree.** Accepting a connection writes two `Follow` rows. Confirming a `WorkProof` may write a `Standing`. Neither may half-happen.
- **Idempotency at every write a client may retry.** `Message.clientMessageId` is the existing pattern; generalise it via `IdempotencyRecord`.
- **Errors are `DomainException` with a named code and an actionable `details` payload.** `DOMAIN_NOT_ELIGIBLE` returns the eligible domains so the client can explain. An error the user cannot act on is a bug.
- **Every index justified.** A missing index on a foreign key you query by is a sequential scan on a table that only grows.
- **No new dependency** without checking whether the monorepo already solves it. It usually does.
- **Comments explain why, not what.** The existing schema comments are the standard — read `WorkProof`'s and match its register.

### 3.5 File management

- Work **phase by phase**, in the order given in master spec §20.2. Do not start P4 before P3's gates pass.
- **One commit per coherent unit**: a model + migration + Zod contract + service + tests is one commit; a web/native component pair is one commit; a screen is one commit.
- Commit subject: `<phase>/<ws>: <imperative>` — e.g. `P6/WS-06: add JobRequirement model and match scorer`.
- **Never bundle a migration with an unrelated UI change.** A migration commit you cannot cleanly revert is a bad afternoon.
- Every commit leaves `pnpm type-check` passing. A commit that does not build is not a checkpoint.
- New API routes go into **both** arrays in `apps/api/src/modules/api-route-coverage.spec.ts` in the same commit. Public routes get a comment saying why they are public.
- Update `docs/HANDOFF.md` **in place** at the end of each phase — rewritten, not appended. Git carries the history.

---

## 4. The eleven phases

Execute in order. Each leaves `main` green and is useful to a real user on its own.

| Phase                                | Contents                                                                                                                                                                                                                                                                                                                                                                 | Exit criterion                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **P0** Ground truth                  | Fix the three stale docs (`DESIGN.md` §7.3 parity table, `project-spec.md` versions, `PARITY.md`); delete every dead i18n key; apply the governorate and university data; add `check-ranking-purity.mjs` and `check-deprecations.mjs` to the lint job with empty ledgers; remove `EmployerCreditKind.APPLICATION_BOOST`; archive the superseded doc trees                | All nine gates pass; `check:i18n` reports zero dead keys                                                        |
| **P1** Low bandwidth                 | Connection-class detection, three modes, payload budgets as a CI gate, field selection, the authors-map feed shape, the shared outbox with both storage adapters, `IdempotencyRecord`, resumable uploads, image variants                                                                                                                                                 | The payload-budget e2e spec passes at all seven endpoints; the 2G Playwright profile completes three journeys   |
| **P2** Graph                         | `Follow`, `FollowerCount`, `FeedMute`, `RestrictedUser`, `SecondDegree`, the suggestion engine with reasons, degree + mutuals on every person DTO, four network tabs                                                                                                                                                                                                     | `check-ranking-purity` passes on `discovery.service.ts`; no `GET /feed` p95 regression                          |
| **P3** Identity & evidence           | Verification (phone, work email, edu email, body queue), profile sections, recommendations, career break, `addressGender`, skill canonicalisation, the Standing engine, the `WorkProof` loop, the server-rendered CV PDF and its mobile twin                                                                                                                             | All §5.9 tests; HANDOFF gaps #5 and #6 closed                                                                   |
| **P4** Content & messaging           | Mentions, polls, articles, newsletters, drafts, scheduling, visibility, comment policy, `PostStats`; message requests, group rooms, voice, outreach, away messages                                                                                                                                                                                                       | One-parser/two-consumers markdown snapshot; the 24 KB feed budget holds with a poll and an article in the page  |
| **P5** Feed engine & search          | Topic tagging, interest weights, the score, diversity, slates, cold start, explainability; `baydar_fold` SQL function, tsvector + trigram, faceted search, saved searches, **the INNER JOIN fix**                                                                                                                                                                        | SQL/TS folding agreement on 200 strings; every slate entry has a reason; `EXPLAIN` shows GIN usage              |
| **P6** Hiring & safety               | Structured requirements, the match score both ways, screening, pipeline, notes, interviews, referrals, document locker, employer verification, the scam scanner, ratings with all three anti-gaming rules, appeals, the team UI, the individual job composer, wage insight, the `payBasis` fix at all four call sites plus mobile's new salary surface, mobile `/j/[id]` | The three fairness invariants; the never-pay banner on every job surface; HANDOFF gaps #3, #4, #7 closed        |
| **P7** Groups, events, notifications | Seeded groups, member groups, events, RSVP, the channel matrix, rollups, the weekly digest, SMS behind `SMS_PROVIDER`                                                                                                                                                                                                                                                    | Exhaustive channel-matrix test; the `joinUrl` leak test                                                         |
| **P8** Services                      | Listings, structured inquiries, the inquiry→room→`WorkProof` loop, coverage chips                                                                                                                                                                                                                                                                                        | The no-payment-field schema test (Rule 2's enforcement)                                                         |
| **P9** Learning                      | Paths, lessons, enrolment, progress, offline bundles, certificate issuance                                                                                                                                                                                                                                                                                               | Audio budget gate; certificate issued exactly once                                                              |
| **P10** Monetisation                 | ILS-first catalog, three wallet adapters, cash-at-agent, reconciliation, multi-currency with the JOD exponent, promotions outside the ranked list, the iOS purchase gate, institutional sponsorship                                                                                                                                                                      | The JOD 3-decimal test; the plan-features regex test; `check-release-placeholders` fails a poisoned iOS fixture |
| **P11** Redesign                     | Everything in the design redesign spec: the `promoted` surface, the `success`/`info` contrast fix, 62 component pairs, the screen recompositions, the `أنا` hub, the connection-class chip                                                                                                                                                                               | `pnpm qa:design`; `check:ui-lockstep` ≤ 4 ledger entries each with a reason; every new route in the a11y spec   |

---

## 5. Definition of done — every phase, all of it

1. Prisma migration committed in the same PR as the schema change.
2. Zod contract updated in `@baydar/shared` for every changed request/response shape.
3. Every new route in **both** arrays of `api-route-coverage.spec.ts`.
4. Service and controller tests cover the happy path **and every named failure path**.
5. Web and mobile flows have Playwright, Jest or documented manual-smoke evidence proportional to risk.
6. i18n keys in all four catalogs, **Arabic authored first**. Arabic plurals carry all six ICU categories.
7. Every new `ui-web` component has its `ui-native` twin, same commit, same prop and variant names.
8. `docs/HANDOFF.md` rewritten in place.
9. `DEPRECATIONS.json` updated for anything deprecated.
10. This sequence passes, in this order:

```powershell
pnpm --filter @baydar/db db:generate
pnpm lint:tokens
pnpm check:tokens
pnpm format:check
pnpm lint
pnpm type-check
pnpm check:i18n
pnpm check:ui-lockstep
pnpm check:naming
pnpm check:ranking-purity
pnpm check:deprecations
pnpm check:native-versions
pnpm check:release-placeholders
pnpm check:security-headers
pnpm test:gates
pnpm test
pnpm qa:design
```

> Run `pnpm --filter @baydar/db db:generate` **immediately after `pnpm install`, before `type-check` or `test`.** Skipping it fails the whole gate with a misleading `TS2305: no exported member 'PrismaClient'`.

**Do not declare a phase done on a failing gate.** If a gate fails and you cannot fix it inside the phase, stop, write the failure and your diagnosis into `docs/linkedin-parity-2026-08/BLOCKERS.md`, and report it. A green build with a suppressed check is worse than a red one.

---

## 6. Three levels of verification — know which one the phase needs

1. **Gate-verified** — the sequence above passes. Necessary, never sufficient. `check:ui-lockstep` returning 0 proves the components pair; it does not prove they render the same.
2. **Behaviour-verified** — a test asserts _the behaviour the spec describes_, not that the code runs.
3. **Evidence-verified** — a screenshot, a captured payload, a measured timing. Required for: the 2G journeys (P1), the feed payload budget (P4), the RTL rendering of every new screen at 390px in Arabic (P11), and the CV PDF's Arabic shaping (P3).

For device evidence use `pnpm --filter @baydar/mobile e2e:device-up`. It exists because gathering that evidence previously took ninety minutes of rediscovering three unrelated blockers, each of which presents as a bug in your own change. Sample pixel values from the captured PNGs; do not judge by eye. That is the standard `HANDOFF.md` set for the `Tabs` underline evidence and it is the standard here.

---

## 7. The no-guess protocol

The specification decides everything with three markers:

- **DECIDED** — final for this scope. Implement exactly as written.
- **DERIVED** — follows mechanically from a market fact in §2 or a scan finding in §1. The derivation is shown so you can re-derive it if a fact changes.
- **OWNER-INPUT** — needs a credential, an account, a legal review, or a human. **Build the code path fully, gate it behind its env var, ship the designed fallback, and record it in the launch-blocker table. Never stub the feature away.** There are eleven of these and every one has a fallback specified.

If you find something the spec does not decide:

1. **Stop.** Do not invent an enum member, a threshold, a table name or a copy string.
2. Append to `docs/linkedin-parity-2026-08/GAPS-FOUND.md`: what you needed, which section should have decided it, and the two or three options.
3. Pick the **most conservative** option — the one that creates no migration you would have to reverse and no user-visible commitment you would have to withdraw.
4. Mark the choice in code with `// GAP-FOUND: <id>` and continue.

That file is a deliverable. An empty `GAPS-FOUND.md` at the end means the specification held; a full one means it did not, and either way the next person needs to know.

---

## 8. What good looks like at the end

- Every phase's gates green, in order, with no suppressed checks.
- `docs/HANDOFF.md` rewritten and true.
- `GAPS-FOUND.md` and `BLOCKERS.md` present and honest, even if empty.
- `check:ui-lockstep` at ≤ 4 ledger entries, each with a written reason.
- Nine models that had no engine now have one.
- Six open `HANDOFF.md` gaps closed.
- A product a Palestinian graduate on a 2G connection in Gaza can actually use, and a Palestinian engineer in Berlin can actually hire through.

Work through it. Think before each phase, verify after each phase, and do not skip the parts that are boring — the boring parts are where this codebase's existing quality came from.
