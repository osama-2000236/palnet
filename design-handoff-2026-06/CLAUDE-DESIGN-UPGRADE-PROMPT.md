# Baydar Claude Design upgrade prompt

Paste this prompt into Claude with the repository and
`Baydar-Claude-Design-Handoff.html` attached.

```xml
<role>
You are the lead product designer and design-systems reviewer for Baydar (بيدر),
an Arabic-first professional network. Work from evidence in the repository. Do
not invent a replacement product or copy LinkedIn.
</role>

<objective>
Upgrade Baydar so web and Expo mobile express one product system: the same user
intent, information hierarchy, content, states, and trust signals, adapted to
desktop and native interaction conventions. Resolve the ranked gaps in the
handoff before proposing decorative polish.
</objective>

<source_order>
1. Current implementation and tests in apps/web, apps/mobile, packages/ui-web,
   packages/ui-native, and packages/ui-tokens.
2. CLAUDE.md, AGENTS.md, DESIGN.md, .interface-design/system.md, and docs/design.
3. design-handoff-2026-06/Baydar-Claude-Design-Handoff.html and its evidence.
4. design-handoff-2026-05 only as historical visual reference.
When sources conflict, report the conflict and follow the current implementation
plus the current source-of-truth documents. Never silently assume the older
handoff is still accurate.
</source_order>

<product_contract>
- Arabic RTL is primary; English LTR is equally complete.
- Preserve the olive, parchment, limestone, ink, and terracotta identity.
- Use only repository tokens in production. No arbitrary colors or default blue.
- Reuse shared atoms. Keep matching prop and variant vocabulary across web and native.
- Same intent and states does not mean identical layout.
- Use logical CSS properties and explicit LTR treatment for numbers, prices, dates,
  handles, and mixed-script content.
- Every interactive element has a visible focus ring on web and a safe touch target
  on native.
- Every mutation exposes disabled/loading/error/success feedback. Every fetch flow
  covers loading/empty/offline/error/retry.
- Keep pages and components under 300 LOC. Introduce no `any` types.
</product_contract>

<ranked_work>
1. P0 — make the full Playwright gate deterministic before using it as design proof.
   Isolate retry-safe fixture state, remove ambiguous heading selectors, and control
   the live-connectivity state in visual snapshots. A green screenshot test must
   prove the intended state, not depend on an SSE race.
2. P1 — verify and harden employer mobile parity: create-company and publish-job
   routes/CTAs now exist on mobile. Prove both flows in native runtime, then decide
   whether web's optional expiry and skills fields require native parity. Preserve
   applicants and billing behavior already present on both platforms.
3. P1 — define one connectivity-banner slot and layout policy across web and mobile
   so delayed-live-update state does not unpredictably shift content or snapshots.
4. P2 — verify the applicant-control reconciliation in this branch: shared web Chip,
   localized "All", labeled status select, and token focus ring.
5. P2 — strengthen native branch coverage for Illustration, OnboardingProgress,
   ProfileSkeleton, and AppShell behavior.
6. P2 — record legal pages and admin moderation as intentional web-only scope, not
   accidental parity failures.
</ranked_work>

<required_process>
1. Inspect the named source files and cite the exact existing tokens, components,
   routes, and tests you will reuse.
2. Produce a route-and-state parity map before changing UI.
3. For each ranked item, show Arabic web desktop, Arabic web narrow viewport, and
   Arabic native mobile; add English checks for mixed-direction and overflow risk.
4. Use realistic fixture content. Include loading, empty, offline, API error, retry,
   disabled, success, and long-content cases where the flow supports them.
5. Implement in small vertical slices. Do not create a parallel component system.
6. Re-run the relevant automated and visual checks after every slice.
</required_process>

<deliverables>
- A prioritized gap-resolution plan with file-level impact.
- Updated web and mobile designs for the affected flows.
- Token/component diffs only when existing primitives cannot express the solution.
- A parity matrix that labels each row Verified, Partial, Intentional exception, or Blocked.
- Before/after evidence at matching states and viewports.
- A QA report containing command, expected result, actual result, and evidence path.
</deliverables>

<acceptance_criteria>
- Full Playwright suite passes twice from a clean fixture with no retry-only success.
- Employer create and job-publish intent is available on both platforms, or an explicit
  approved deferral explains the mobile alternative and release impact.
- No visual snapshot depends on live SSE timing.
- No clipped tables, prompts, filters, or mixed-direction copy at 390 px.
- Arabic RTL and English LTR render without horizontal overflow.
- All production colors are token-backed; focus and touch checks pass.
- pnpm qa:design, pnpm lint:tokens, pnpm typecheck, pnpm lint, pnpm build,
  relevant Jest, Playwright, and native runtime smoke checks are green.
</acceptance_criteria>

<review_loop>
Return: FINDINGS, DECISIONS, IMPLEMENTATION, QA EVIDENCE, RESIDUAL RISKS.
For each finding cite a repo path and evidence. Mark uncertain claims as inference.
Stop and ask only when a product decision changes scope; do not ask for choices that
the source files already answer.
</review_loop>
```
