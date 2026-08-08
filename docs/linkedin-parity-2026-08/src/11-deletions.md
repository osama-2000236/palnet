---

# 19. Deletions and deprecations

Every entry here is evidence-based: the scan proved it is dead, duplicated, or architecturally wrong. Each carries a migration and a rollback. **Nothing in this section removes a feature a user can currently reach.**

The general rule for any column removal is **two releases**: release N adds the replacement and dual-writes; release N+1 stops reading the old column; release N+2 drops it. Prisma migrations are irreversible in practice on a production Postgres, so a dropped column is a restore-from-backup, and that is a bad afternoon.

## 19.1 Dead code and dead data — safe to delete now

| Target | Evidence | Action |
| --- | --- | --- |
| `EmployerCreditKind.APPLICATION_BOOST` | No writer, no reader, and Rule 1 (§4.2) makes it permanently unbuildable — an application boost is money buying rank | Remove the enum member. No rows exist. Add a `check-naming` ban on `APPLICATION_BOOST` so it cannot return |
| `Profile.pronouns` | Free-text, no consumer, and the wrong model for Arabic (§5.2.3) | Two-release removal; `addressGender` replaces it. See §19.3 |
| `Company.verified Boolean` | Superseded by `verificationState` (§10.2); a boolean cannot express PENDING or SUSPENDED | Dual-write for one release, then drop |
| `Job.skillsRequired String[]` | Superseded by `JobRequirement` + `mustSkills`. The schema comment already says it "stays only for the long tail" | Keep the column, stop writing it from the composer, migrate existing values into `JobRequirement(kind=SKILL, level=NICE)`. Drop in a later release once the long tail is measured at zero |
| `JobAlert` (whole model) | Superseded by `SavedSearch` (§17.3). Two saved-search systems is the exact drift the gates exist to prevent | Migrate every row into `SavedSearch(kind="JOB", alertEnabled=true)`, keep the three `/jobs/alerts*` routes as aliases for one release, then remove |
| `apps/web/src/app/[locale]/cv/page.tsx` print-only CSS | Replaced by the server-rendered `GET /cv/:handle.pdf` (§5.6), which removes an entire class of RTL-shaping divergence | Delete the print stylesheet and the `@media print` block; the route becomes a thin wrapper that fetches the PDF |
| `design-handoff-2026-05/` | Superseded by `design-handoff-2026-06/`, which `CLAUDE.md` names as the current entry point | Move to `docs/_archive/design-handoff-2026-05/`. Do not delete — it carries the reasoning for decisions still in force |
| `docs/design/handoff-plan.md`, `docs/design/open-design-*.md` (3 files) | Point-in-time planning artefacts, superseded by `PARITY.md` and `SCREENS.md` | Archive under `docs/_archive/design-2026-05/` |
| Dead i18n keys | `pnpm check:i18n` reports them | Delete every key the gate flags as dead, in one commit, before adding any new namespace — otherwise the new keys hide the old rot |

## 19.2 Karama — reframed, not deleted

`KaramaLedger`, `karamaBalance` and the decay cron all work. `HANDOFF.md` records that two of the three rewards were withdrawn because they debited points and granted nothing, leaving premium as the only reward.

**DECIDED — do not delete Karama, and do not restore the withdrawn rewards.** Karama is reframed as **an activity ledger, not a currency**:

- It keeps `PROFILE_COMPLETE`, `ENDORSEMENT`, `VERIFIED_HIRE`, `RATING_RECEIVED`, `REPORT_UPHELD`, `FIRST_POST` as earn reasons — these are a useful record of contribution.
- `REDEEM_PREMIUM` stays: exchanging accumulated activity for a month of `MEMBER_PLUS` is legitimate, because `MEMBER_PLUS` contains no rank (§13.2).
- `REDEEM_BOOST_APPLICATION` and `REDEEM_FEATURED_PROFILE` stay **as enum members only**, so historical ledger rows still read, and are permanently unimplementable under Rule 1. A comment on each member says so, and `check-naming.mjs` bans the strings `BOOST_APPLICATION` and `FEATURED_PROFILE` outside the enum declaration.
- `DECAY` stays. A ledger that only grows stops meaning anything.
- **Karama is never a ranking input.** `check-ranking-purity.mjs` already covers `karamaBalance` and `KaramaLedger`.

**Why not delete it.** Deleting it would be the tidy move and it would be wrong: in a market where most members have no verifiable employment history, a record of platform contribution is one of the few honest signals a new member can build in their first month, and it costs nothing to keep.

## 19.3 The `pronouns` → `addressGender` migration

Release N: add `addressGender`, add the `AddressGender` enum, add `addressed()` to `@baydar/shared/format.ts`, migrate the 34 identified strings to `_f`/`_m` variants, ship the settings control. **Do not read `pronouns` anywhere.**
Release N+1: confirm zero reads of `pronouns` across both clients with a grep gate; drop the column.

**Why this is not a regression.** `pronouns` is a free-text field with no consumer — nothing in either client renders it. `addressGender` is a rendering input that Arabic grammar actually requires: a second-person imperative addressed to a woman is a different word, and getting it wrong in every string is a quality signal a native speaker notices immediately. This is a strict improvement, and framing it as "removing pronouns" misreads it — the product never had them working.

## 19.4 The `Company.verified` migration

Release N: add `verificationState`, backfill `verified = true → VERIFIED`, `false → UNVERIFIED`, dual-write both on every state change.
Release N+1: every read switches to `verificationState`; a grep gate asserts zero reads of `verified`.
Release N+2: drop `verified`.

## 19.5 The `JobAlert` → `SavedSearch` migration

One data migration copies each `JobAlert` row into a `SavedSearch` with `kind = "JOB"`, `alertEnabled = true`, and `queryJson` built from the five existing fields (`q`, `city`, `type`, `locationMode`, `industry`). `industry` is a free-text column; the migration maps it against `PS_INDUSTRIES` keys and **preserves unmatched values verbatim in `queryJson.industryFreeText`** rather than dropping them, so no member silently loses an alert. The three `/jobs/alerts*` routes stay as aliases writing to `SavedSearch` for one release, then are removed from the route-coverage spec.

## 19.6 What is deliberately NOT deleted

Listed because a future audit will propose each of them and the reasoning should not have to be rediscovered:

- **The six token/join models never named in a client** — `RefreshToken`, `EmailVerificationToken`, `PasswordResetToken`, `SseStreamToken`, `ProfileSkill`, `ChatRoomMember`. All six are correctly server-side. `HANDOFF.md` already establishes this.
- **`react-native-reanimated`, `react-native-worklets`, `expo-linking`, `@react-navigation/native`** — zero imports, all declared peers of `expo-router` or `@react-navigation/bottom-tabs`. Removing them breaks the build.
- **The nine engineless occupation/ranking models.** §1.3.1 counted them; §5, §8 and §10 build every one. `HANDOFF.md` warns that *"empty tables that outlive their plan are how a schema rots"* — this plan is that plan.
- **`ChatRoom.isGroup` / `title`** — no UI today, full UI in §14.
- **`Job.screeningQuestions Json`** — kept for one release alongside `ScreeningQuestion` rows, then migrated and dropped, because existing rows may contain data.
- **`UserRating`** — full backend, no UI, and §16.5 finally decides the anti-gaming rules that were blocking it.

## 19.7 The deletion gate

A new script, `scripts/check-deprecations.mjs`, added to the lint job. It reads `docs/linkedin-parity-2026-08/spec/DEPRECATIONS.json` — a ledger of `{ symbol, deprecatedInRelease, removeInRelease, allowedReadSites[] }` — and fails when a symbol is read outside its allowlist, or when a symbol has passed its `removeInRelease` and still exists. This is the same pattern as the existing gates' known-exception ledgers, and it is what stops a two-release migration from becoming a permanent one.
