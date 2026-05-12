# Codex Handoff Plan — Round 2

## Context

Bundle at `design-handoff-2026-05/` shipped round 1 (jobs a11y, Toast inventory, login token, snapshot refresh, Items 1+2+3 resolved). PR #22 open.

This round closes the 4 remaining `[HUMAN]` gates the bundle README listed:

1. Mobile snapshots — `04-screens/{screen}/mobile/{ios|android}-{locale}-default.png`.
2. Moodboard images — `09-moodboard/{ref-slug}/screen.png` for the 5 curated refs in `09-moodboard/README.md`.
3. Ask-scope confirmation in `10-ask.md`.
4. Pain-walk additions in `08-pain.md` ("Lead additions" section).

The README of `09-moodboard/` says AI can't do (2) reliably. The plan calls that out and lets Codex attempt with explicit caveats — degrade-gracefully is fine. (3) and (4) are well-scoped for Codex with vision over the refreshed `04-screens/*/web/` PNGs. (1) is hardware-gated for iOS sim + Android emu, but the repo has an Expo Web target (`pnpm --filter @baydar/mobile web`); Codex captures Expo Web at mobile viewports as a high-fidelity proxy, clearly labeled.

## Goal

Produce a fully-self-sufficient bundle so it can hand off to Claude Design with **zero** remaining `[HUMAN]` gates.

## Success criteria

1. `04-screens/{screen}/mobile/` contains PNGs for **every shipped mobile screen** (feed, jobs, messages, network, notifications, search, onboarding, settings, plus public `auth-login`, `auth-register`) at iOS + Android viewport approximations, in `ar-PS` and `en`. Each PNG ≥ 8 KB and filename clearly indicates source (`expo-web-iphone15-ar-PS.png` etc.) so reviewers don't mistake them for native captures.
2. `09-moodboard/{ref-slug}/screen.png` and `notes.md` exist for at least **3** of the 5 refs in `09-moodboard/README.md`. If fewer than 3 capture cleanly, log the failures in the packet `risks[]`.
3. `10-ask.md` includes a `## Round 2 scope re-audit` section that compares the original 3 in-scope picks against the current `08-problems.md` (Items 1+2+3 resolved) and either confirms or recommends new picks with rationale.
4. `08-pain.md` "Lead additions" section is filled with concrete findings from analyzing every fresh PNG in `04-screens/{screen}/web/`. Each finding follows the existing format (screen / area / problem / severity).
5. `pnpm format:check` clean (round 1 ate a CI failure on this — don't repeat).

## In scope

### Item 1 — mobile snapshots via Expo Web

Write `scripts/capture-mobile-snapshots.mjs` modeled on `scripts/capture-snapshots.mjs` but pointed at `http://localhost:8081` (Expo Web default) with these device profiles:

- iPhone 15: 393 × 852, scale 3.
- Pixel 7: 412 × 915, scale 2.625.

Routes to capture (same set the web script uses, mirroring the mobile app):

- `feed`, `jobs`, `messages`, `network`, `notifications`, `search`, `onboarding`, `settings`
- Plus public `auth-login`, `auth-register` if Expo Web supports their unauthed entries.

For each route × device × locale, save to `design-handoff-2026-05/04-screens/{screen}/mobile/expo-web-{device}-{locale}.png`.

**Server bootstrap:**

- Start API: `pnpm --filter @baydar/api dev` (background, wait for `:4000/api/v1/health` 200).
- Start Expo Web: `pnpm --filter @baydar/mobile web` (background, wait for `:8081` 200). On Expo Web the bundler is Metro, port may differ — check the dev log for the actual URL and adapt.
- Auth: try to reuse `apps/web/tests/.auth/storageState.json` cookies/localStorage against `:8081`. If the mobile app stores its session in a different shape (it does — `expo-secure-store` / `AsyncStorage`), Codex emits a `questions[]` entry instead of guessing; mobile snapshots then capture login screens for authed routes (better evidence than blank).

**Out-of-bundle environment requirement:**

- Postgres on `127.0.0.1:5433`, env at `.env.local` (already set up — last round used it).

**Risk acknowledgement Codex must include in `risks[]`:**

- "Expo Web is not a native iOS/Android renderer. Touch-target sizing, native gestures, safe-area insets, and native bottom-tab chrome may render differently on real devices. Filenames use `expo-web-` prefix so reviewers don't conflate with native captures."

If Expo Web fails to build for this repo (Metro errors, RN package incompatibility, etc.), do NOT silently fall back to web-app mobile-viewport captures. Log the failure verbatim in `risks[]` + `questions[]` and stop Item 1. Better to leave that gate `[HUMAN]` than to ship misleading captures.

### Item 2 — moodboard images

`09-moodboard/README.md` lists 5 refs (tabby, tamara, linear, raseef22, careem). For each:

1. Use Playwright to load the URL (the README has them).
2. Navigate to the specific frame the README's "Look at" line specifies.
3. Save full-page screenshot to `09-moodboard/{ref-slug}/screen.png`.
4. Copy the relevant ref block from the README into `09-moodboard/{ref-slug}/notes.md`.

Set Playwright `locale: "ar"` and `Accept-Language: ar` for the Arabic-rendering refs (tabby, tamara, raseef22, careem). Use `en` for linear.

**Failure modes that are acceptable:**

- Cookie wall / region-blocked content → save what's visible, note in `notes.md` that the frame was partial.
- Rate-limited / 429 → skip that ref, log in packet `risks[]`.

**Failure modes that are NOT acceptable:**

- Capturing wrong page / wrong frame and claiming it matches the README's "Look at" — better to skip and log.
- Saving low-resolution thumbnails.

Minimum **3 of 5** refs must produce a clean `screen.png` ≥ 50 KB + matching `notes.md`. If fewer, surface in `questions[]`.

### Item 3 — Ask-scope re-audit in `10-ask.md`

After Items 1+3 from round 1 shipped and Item 2 was resolved-as-not-a-bug, audit the 3 in-scope picks currently in `10-ask.md` ("Empty-state system", "Surface hierarchy audit", "Onboarding flow"):

- Read `08-problems.md` current state.
- Read `08-pain.md` current state (and your own additions from Item 4 below).
- Re-rank by leverage. If the 3 in-scope picks still top the list, append a new section:

  ```markdown
  ## Round 2 scope re-audit (2026-05-12)

  Re-audited against current `08-problems.md` after round 1 resolved Items 1-3.
  The original 3 picks (empty-state system, surface hierarchy, onboarding flow)
  remain highest-leverage. Reasons:

  - …
  - …
  - …

  No scope change recommended for the design pass.
  ```

- If the picks should change, propose alternates with rationale. Do not delete the original picks — keep them as a strikethrough record so reviewers see the decision history.

### Item 4 — Pain-walk additions in `08-pain.md`

`08-pain.md` "Lead additions" placeholder needs concrete content. Codex reads every PNG in `design-handoff-2026-05/04-screens/{screen}/web/` (60 files, refreshed 2026-05-12 07:43) and identifies issues using its vision capability.

Append findings to the `## Lead additions` section in the existing format:

```
- screen: {feed|profile|...}
  area: {hero|composer|empty|right-rail|...}
  problem: {one sentence what feels wrong}
  severity: {high|med|low}
```

Bias toward issues a designer would catch: spacing inconsistencies, visual hierarchy weakness, surface-variant misuse (the "every section as card" anti-pattern called out in `08-problems.md`), avatar/skeleton state issues, RTL-specific rendering bugs. Aim for **≥ 8 new findings** across the 8 screens — but quality over quantity. Don't pad.

For each finding, reference the specific snapshot path so a reviewer can verify:

```
- screen: feed
  area: right-rail mini-profile
  problem: ...
  severity: med
  snapshot: 04-screens/feed/web/desktop-ar-PS-default.png
```

The existing AI-written `08-pain.md` "v2 walk" section is good — match that voice and rigor.

## Out of scope (do not touch)

- Any change to `02-system/tokens.*`, `BRAND.md`, `RTL.md`, `MOBILE.md`, `NAV.md`, `PARITY.md`.
- Any change to `03-components/*` (bundle snapshots — frozen for handoff).
- Any code outside `scripts/capture-mobile-snapshots.mjs`. Specifically: do not edit `apps/`, `packages/`, or root `*.md` files except `08-pain.md`.
- The existing `04-screens/*/web/*.png` web snapshots. Do not regenerate.
- Real iOS sim / Android emu integration — those remain user-only.

## Approval criteria

- All 5 success criteria met OR every miss surfaced as a `risks[]`/`questions[]` entry with concrete error logs.
- Mobile PNGs are clearly labeled (`expo-web-` prefix) and Codex explicitly disclaims native-fidelity in `risks[]`.
- Moodboard images ≥ 3 captures; misses logged.
- `10-ask.md` re-audit section is concrete, not boilerplate.
- `08-pain.md` Lead additions ≥ 8 findings, each referencing a snapshot path.
- `pnpm format:check` passes.

## Commit authority

User has **not** pre-authorized. Codex stops at green QA + emits packet. Claude reviews → user authorizes commit explicitly.

## Risks

- Expo Web may not build cleanly for this RN app (common: native modules without web shims, font loading, Hermes-only APIs). If it fails, Item 1 is out of reach for Codex.
- Moodboard sites may block headless browsers / require cookies / serve regional walls. Some refs may be uncapturable from Codex's environment.
- AI vision over snapshots is good but not equivalent to a designer walking the live app. The `08-pain.md` additions should be marked as "AI-assisted, lead review pending" in the section header.

## Environment

- Repo: `C:\LinkedIn\.claude\worktrees\adoring-pare-2bf794`.
- PG: `127.0.0.1:5433`, trust auth, db `baydar`.
- Env: `.env.local` at repo root.
- API dev: `pnpm --filter @baydar/api dev` (`:4000`).
- Web dev: `pnpm --filter @baydar/web dev` (`:3000`).
- Mobile web: `pnpm --filter @baydar/mobile web` (port TBD via Metro).
- Playwright browsers: `C:\Users\osama\AppData\Local\ms-playwright\`.

## Round budget

Max 3 review rounds before escalating to user.
