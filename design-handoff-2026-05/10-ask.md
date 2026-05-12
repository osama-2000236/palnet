# Ask for Claude Design — Pass 1

> AI proposed scope below. Lead overrides if wrong. Picks based on leverage:
> screens affected × shipped-state weakness × system-level impact.

## Pre-conditions (fix before design pass)

These are launch-blocking bugs found in the snapshot walk (`08-pain.md`). Engineering fix, not design:

1. `/ar-PS/settings` returns Next.js 404. Restore route or auth-gate it correctly.
2. Search tab pills show raw i18n keys (`search.tabs.jobs` etc.). Add Arabic + English translations.
3. Jobs empty state shows raw `API 403 PROFILE_ONBOARDING_REQUIRED`. Replace with friendly copy + onboarding redirect CTA.
4. Runtime errors (`1 error` / `7 errors` dev overlay) on most screens. Investigate root cause before shipping snapshots to Claude Design — design pass on broken state wastes effort.

Lead acknowledges these are out of scope for the design pass and tracked separately.

## In scope (this pass) — 3 items

### 1. Empty-state system + illustration direction

**Problem:** Every shipped screen has bare empty state — single line of copy in tinted surface, no illustration, no recoverable action. Confirmed in `08-pain.md` for: feed, network, messages, notifications, search. `DESIGN.md §12` mandates illustration + action.

**Deliverable:**

- Illustration style direction (1 reference + style notes — line-art? geometric? photographic? agrarian motif aligned with Baydar metaphor?).
- Per-screen empty state mock for all 8 screens (Arabic + English).
- New tokens if needed (illustration size scale, illustration tint).
- Empty-state component spec for `@baydar/ui-web` + `@baydar/ui-native` (props: illustration, title, description, action).

### 2. Surface hierarchy audit + redesign

**Problem:** Most shipped screens use single `card` or `flat` surface and no inner hierarchy (`08-problems.md` #5). Right rails inconsistent across screens (Feed has 2, Jobs has 1, Network/Notifications/Settings have none) — eye doesn't know if rail is part of the pattern. Confirms "every section as card" anti-pattern.

**Deliverable:**

- Per-screen surface map: which of the 5 variants (`flat`, `card`, `hero`, `tinted`, `row`) goes where, and why.
- Right-rail policy: when does a screen get a rail? What goes in it?
- Mocks for top 4 screens (feed, network, jobs, messages) showing corrected hierarchy.
- Update `docs/design/SCREENS.md` from stub → real per-screen recipe.

### 3. Onboarding flow — full design + integration with shell

**Problem:** `apps/web/src/app/[locale]/(app)/onboarding` exists but has no shell (per snapshot — bare form, no top nav). `DESIGN.md` doesn't document onboarding. First-impression screen for every new user.

**Deliverable:**

- Flow design: signup → email verify → profile complete → first connect → feed (5 steps).
- Decision: does onboarding use AppShell or a focused single-purpose shell? Document either way.
- Per-step mock (Arabic first, English second).
- Empty + completion states for each step.
- Add onboarding section to `docs/design/SCREENS.md`.

## Out of scope (future passes)

- Dark mode design (decide first: ship light-only?). `08-problems.md` #2.
- Motion vocabulary doc. `08-problems.md` #10.
- Final logo mark. `08-problems.md` #8 — run as separate brand contract.
- Profile cover gradient palette. `08-problems.md` #4.
- Mobile `Tabs` + Web `Sheet` primitives. `08-problems.md` #6, #7 — engineering, not design.
- Toast inventory addition to `DESIGN.md §7`. Repo addendum, low effort, dev pass.

## Constraints (must respect)

- All hard rules from `00-README.md`.
- Tokens only. Propose new tokens if needed; never inline values.
- Web + mobile parity. Every component change ships both twins.
- Arabic-first. Show Arabic mocks first, English second.
- Five surface variants — use intentionally, never nest cards.
- RTL-safe (logical CSS only).
- No dark mode this pass.

## Deliverables expected back

For each in-scope item, deliver under `design-out/{problem-slug}/`:

- `mock-{screen}-{platform}-{locale}.png` — Arabic first, English second.
- `token-diff.md` — additions/changes to `02-system/tokens.ts`.
- `component-changes.md` — list of component prop/variant changes (web + native parity).
- `rationale.md` — ≤200 words. What changed, why, what tradeoffs considered.

## Acceptance criteria

- All deliverables present.
- Mocks render against current `06-fixtures/content.json` strings without clipping.
- Token diff applies cleanly to `02-system/tokens.ts` (no untokenized inline values).
- Web + mobile twin shown for every component touched.
- No LinkedIn-derivative compositions.

## Review loop

Lead reviews → APPROVED | CHANGES_REQUESTED. CHANGES_REQUESTED returns concrete fixes; Claude Design reworks. Max 3 rounds per pass.

## Round 2 scope re-audit (2026-05-12)

Re-audited against current `08-problems.md` after round 1 resolved Items 1-3 and after the AI-assisted `08-pain.md` lead additions reviewed the refreshed `04-screens/*/web/` PNGs.

The original 3 picks (empty-state system, surface hierarchy, onboarding flow) remain highest-leverage. Reasons:

- Empty states are still the most repeated user-visible weakness. Jobs, network, notifications, search, messages, and feed all show bare rows or icon-only placeholders without the illustration plus recoverable action required by `DESIGN.md §12`.
- Surface hierarchy still needs a system pass, not one-off screen fixes. The refreshed snapshots show thin tinted strips, right-rail skeleton/profile cards, dense filter pills, and mobile layouts that inherit desktop structures without a clear surface policy.
- Onboarding remains the first impression with the least design context. The current form is a centered stack with no progress model, shell decision, or product explanation, and `08-problems.md` still lists the flow as undocumented in `DESIGN.md`.
- The new findings do not outrank those three picks. Auth/register trust polish, mobile web nav compression, and the visible dev `1 error` badge are real issues, but they either fold into the surface/mobile treatment or should be handled as engineering cleanup before final snapshot handoff.

No scope change recommended for the design pass.
