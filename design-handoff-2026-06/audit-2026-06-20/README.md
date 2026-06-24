# Baydar web/mobile parity audit — 2026-06-20

## Scope and evidence

- Latest supplied design artifact: `../Baydar-Claude-Design-Handoff.html`
  (prior revision dated 2026-06-19).
- Surfaces: public/auth, core app, employer, premium/billing, trust/safety,
  settings, responsive web, and Android Expo runtime.
- Viewports used by the repo visual gate: 1440×900 and 390×844.
- Native runtime: Android emulator `emulator-5554`.
- This is a risk-based audit, not a claim of full accessibility conformance.

## Current QA results

| Gate | Actual result | Evidence |
| --- | --- | --- |
| `pnpm qa:design` | PASS; production UI clean. Legacy API/service files over 300 LOC remain warnings. | command output, 2026-06-20 |
| `pnpm lint:tokens` | PASS | command output, 2026-06-20 |
| Web Jest | PASS — 5 suites, 20 tests | command output, 2026-06-20 |
| Mobile Jest | PASS — 31 suites, 84 tests, 5 snapshots; 82.65% statements / 62.59% branches | command output, 2026-06-20 |
| Web production build | PASS — 76 generated pages/routes | command output, 2026-06-20 |
| Full Playwright attempt | NOT RELIABLE — exposed fixture/API availability races, an ambiguous heading locator, an SSE-driven visual shift, non-idempotent moderation retry state, and a runner/teardown hang. | `web/05-activity-expected-v-actual.png` and generated Playwright error contexts |
| Android runtime | BLOCKED in first capture at Expo Go `Bundling 100%`; unit/runtime bundle proof is not equivalent to a completed flow smoke. | `mobile/01-emulator-current.png` |

## Ranked findings

### P0 — E2E evidence gate is nondeterministic

Observed:

- `ux-sad-path.spec.ts` uses `getByRole("heading", { name: "Activity" })`,
  which matches both “Activity” and “Activity is unavailable”.
- The connectivity/SSE banner appears in the current activity snapshot and shifts
  the whole page, producing a 3% pixel diff against the baseline.
- Moderation retry repeats a connection setup that is not idempotent; the first
  attempt can create the connection and the retry then fails on the duplicate.
- Under full parallel CI execution, feed/profile requests became unavailable and
  safety/moderation flows could not reach their target controls.

Impact: the suite cannot yet certify design parity or flow health as one green gate.

Repairs applied in this branch:

- exact Activity heading selectors;
- one-project safety lifecycle and one CI worker to reduce shared-state pressure;
- retry-safe moderation connection setup;
- stable `data-testid` contract for connectivity banners and an offline assertion
  that no longer waits on unrelated profile data;
- updated activity snapshot baseline that explicitly includes degraded live updates.

The final focused visual run produced no assertion failure artifacts after the
baseline repair, but the Playwright process did not exit cleanly in this Windows
session. Therefore the gate remains Blocked, not Passed.

### Core intent resolved in branch — Employer creation and publishing are now on mobile

Prior route conflict:

- Web has `/employer/new` and `/employer/[slug]/jobs/new`.
- Mobile had employer list, job list, applicants, and billing, but no create-company
  or publish-job route/CTA.

Fix applied in this branch (commit `a7de0fe`):

- new `employer/new` screen (twin of web `employer/new`) and `employer/[slug]/new-job`
  screen (twin of web `employer/[slug]/jobs/new`), both built from shared
  `Input`/`Button`/`RadioGroup`/`Surface` atoms and tokens only;
- create-company CTA on the employer list and publish-job CTA on the company jobs
  screen; both hidden tab routes registered;
- Arabic-first `employer.form` / `employer.newJob` / `employer.jobType` /
  `employer.locationModeOptions` strings added to ar and en.

Mobile implementation now matches web's core intent. Field parity and runtime proof
remain partial: the native publish form omits web's optional `expiresAt` date and
free-form skills list (API accepts both as optional / empty), and Android flow smoke
is still blocked at Expo bundling. Static evidence is green: mobile `type-check`,
`lint`, `lint:tokens`, and Jest (31 suites / 84 tests).

### P1 — Connectivity state lacks a stable layout contract

The current live-update delay banner is useful and accessible, but its asynchronous
appearance changes vertical layout and snapshot output. Define a reserved slot or a
deterministic test state on web and native.

### P1 — Prior handoff was not mobile-readable

The 2026-06-19 artifact clipped the parity table and compressed the copy prompt at
390 px. The upgraded artifact converts rows to labeled cards and restores readable
prompt wrapping.

### Resolved in branch — Applicant controls drifted from the shared system

The web applicants page declared a local `Chip`, hard-coded “All”, and used an
unlabeled raw `select`, while mobile used the shared `Chip`. This branch replaces
the local control with `@baydar/ui-web` `Chip`, adds Arabic/English copy and a
localized select label, and applies the token focus ring. Typecheck, lint, build,
translation parsing, and web Jest pass; focused visual E2E still depends on the
broader Playwright gate repair.

### P2 — Native risk is concentrated in branches, not route count

Mobile route coverage is broad, but branch coverage is thin for visual shell/state
components, especially `Illustration`, `OnboardingProgress`, `ProfileSkeleton`, and
`AppShell`. Add state/interaction tests before calling visual parity complete.

## Intentional exceptions

- Legal pages are web-only.
- Admin moderation and admin billing are web-only; reporter safety behavior remains
  available on both platforms.
- Desktop multi-column layout and native one-column layout are expected differences.

## Evidence files

- `web/00-artifact-desktop.png` — prior artifact at desktop width.
- `mobile/00-artifact-mobile.png` — prior artifact showing narrow-width clipping.
- `web/02-activity-error-expected.png` — visual baseline.
- `web/03-activity-error-actual.png` — current rendered state.
- `web/04-activity-error-diff.png` — pixel diff.
- `web/05-activity-expected-v-actual.png` — same-viewport comparison.
- `mobile/01-emulator-current.png` — Android runtime blocker capture.
- `mobile/03-emulator-bundling-crop.png` — focused runtime blocker evidence embedded in the artifact.
- `mobile/04-artifact-v1-clipping-crop.png` — focused prior narrow-layout defect evidence.
- `web/06-artifact-v2-desktop.png` — upgraded artifact desktop verification.
- `mobile/02-artifact-v2-mobile.png` — upgraded artifact at 390 px with no horizontal overflow.

## Official Claude source map

- [Artifacts overview](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them): artifacts should be substantial, reusable, and self-contained.
- [Claude Code artifacts](https://code.claude.com/docs/en/artifacts): one self-contained page; no external requests/backend; single-page navigation; `.html`, `.htm`, or `.md`; rendered size ≤16 MiB; project design system and prompt precedence.
- [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices): clear direct instructions, context, structured examples, XML sections, and explicit output constraints.
- [Define success and evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests): specific/measurable criteria, task-specific edge cases, automation, and reliable grading.

Sources inspected 2026-06-20. Findings above are observed unless explicitly labeled
as an inference.
