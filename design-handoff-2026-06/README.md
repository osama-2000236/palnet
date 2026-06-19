# Baydar web + mobile design handoff — 2026-06-19

This is the current Claude-ready design handoff. Start with
`Baydar-Claude-Design-Handoff.html`; it is a self-contained artifact with no
external requests, fonts, scripts, or backend dependency.

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

## Current parity contract

| Flow               | Web       | Mobile              | Required shared behavior                                                |
| ------------------ | --------- | ------------------- | ----------------------------------------------------------------------- |
| Auth + onboarding  | Yes       | Yes                 | Arabic-first, field-local validation, recoverable errors                |
| Feed + post safety | Yes       | Yes                 | Post, react, comment, save, report; stable loading/success/error states |
| Search + company   | Yes       | Yes                 | People/jobs/companies, verified marker, public company route            |
| Jobs               | Yes       | Yes                 | Company filter, job detail, application feedback                        |
| Profile + skills   | Yes       | Yes                 | Public profile, edit, skill endorsements, Karama                        |
| Personal premium   | Yes       | Yes                 | Catalog, checkout, invoices, active-plan state                          |
| Employer billing   | Yes       | Yes                 | Plans, slots, credits, checkout, invoices                               |
| Moderation         | Admin web | Reporter mobile/web | Report resolution notification and post takedown                        |
| Theme              | Yes       | Yes                 | Warm light/dark tokens; no generic blue                                 |

## Claude design platform use

1. Upload or paste `Baydar-Claude-Design-Handoff.html` into Claude as an artifact.
2. Give Claude the repository plus the prompt copied from the artifact.
3. Ask for one flow at a time and require both web and mobile output.
4. Require Claude to cite the exact token and atom files it will reuse before edits.
5. Verify with Arabic RTL, English LTR, narrow mobile, desktop, keyboard, and touch.

The artifact stays below Claude's 16 MiB limit and follows the single-page,
inline-resource constraints documented for Claude Code visual artifacts.
