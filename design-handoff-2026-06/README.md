# Baydar web + mobile design upgrade handoff — 2026-06-20

Start with `Baydar-Claude-Design-Handoff.html`. It is a self-contained Claude
artifact with embedded QA evidence, no runtime external requests, fonts, or
backend dependency. For a plain-text paste, use
`CLAUDE-DESIGN-UPGRADE-PROMPT.md`. Full findings and evidence live under
`audit-2026-06-20/`.

## Source of truth

- Product rules: `CLAUDE.md`, `AGENTS.md`, `.interface-design/system.md`
- Tokens: `packages/ui-tokens/src/index.ts`, `packages/ui-tokens/tokens.css`
- Web atoms: `packages/ui-web/src/index.ts`
- Native atoms: `packages/ui-native/src/index.ts`
- Web routes: `apps/web/src/app/[locale]`
- Mobile routes: `apps/mobile/app`
- Prior visual source: `design-handoff-2026-05/`

Do not copy the HTML artifact into production. It explains the system; the repo
tokens and shared atoms implement it.

## Current evidence-led parity contract

| Flow | Web | Mobile | Audit status |
| --- | --- | --- | --- |
| Auth + onboarding | Implemented | Implemented | Verified by unit/build; runtime smoke remains |
| Core feed/network/search/jobs | Implemented | Implemented | Partial proof; full E2E gate is unstable |
| Messages/notifications/activity/saved | Implemented | Implemented | Connectivity/offline proof blocked by nondeterministic E2E |
| Profile/settings/premium | Implemented | Implemented | Partial proof |
| Employer billing/applicants | Implemented | Implemented | Shared-control drift fixed; visual proof remains |
| Employer create/job publish | Implemented | Implemented with reduced optional fields | Core intent landed; native runtime and expiry/skills decision remain |
| Moderation | Admin + reporter | Reporter | Intended role difference; lifecycle E2E unstable |
| Legal/admin | Implemented | Out of scope | Intentional platform exception |

Do not read “implemented” as “fully verified.” The artifact distinguishes
implementation coverage from current QA proof.

## Claude design platform use

1. Attach `Baydar-Claude-Design-Handoff.html` and give Claude repository access.
2. Copy the XML prompt from the artifact or the standalone prompt file.
3. Resolve P0 evidence reliability first, then P1 flow gaps, then P2 coverage.
4. Require file-level citations, matching-state before/after evidence, and explicit
   Verified/Partial/Intentional/Blocked labels.
5. Accept only after Arabic RTL, English LTR, 390 px web, desktop, native runtime,
   keyboard, touch, and complete state checks pass.

The artifact is about 0.30 MiB, below Claude's 16 MiB rendered-size limit, and
follows the single-page inline-resource constraints in official Claude Code
artifact documentation.
