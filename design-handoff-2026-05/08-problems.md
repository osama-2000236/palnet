# Design Problems — Confirmed Targets

> **Sprint 27 re-verification (2026-07-02):** every item re-checked against `main` after Sprints 22–26 and the Open Design implementation pass. Resolved items struck with evidence; open items renumbered for the Pass 2 ask.

## Resolved (verified in code)

1. ~~`docs/design/SCREENS.md` is a stub~~ — **resolved**: real per-screen recipe matrix with global recipe, public/auth/core tables, and critique-score gate.
2. ~~Dark mode undecided~~ — **resolved**: warm-dark theme shipped (`ab981a0`); semantic light/dark token contract on web + mobile (`ThemeProvider`, `useThemeTokens`).
3. ~~Empty-state illustrations missing~~ — **resolved**: `EmptyState` + `Illustration` (harvest motif, tint/size scale) in `@baydar/ui-web` and `@baydar/ui-native`; consumed by 15 web routes.
4. ~~Profile cover gradient unspecified~~ — **resolved**: `--cover-gradient` token (`tokens.css:174`, Olive Depth 135deg) — the single allowed decorative gradient per `DESIGN.md §13`.
5. ~~Surface variants under-utilized~~ — **resolved** by the Open Design pass; all routes scored ≥8/10 in `docs/design/open-design-screen-critique.md`.
6. ~~Mobile `Tabs` primitive not started~~ — **resolved via parity decision**: native uses `SegmentedControl` + Expo Router bottom tabs; web has `Tabs.tsx`.
7. ~~Web `Sheet` primitive not started~~ — **partially resolved**: native `Sheet.tsx` shipped; web covers the role with `Dialog`/`Popover`/`Menu`. Revisit only if a real web use-case appears.
8. **Logo** — mark exists: `packages/ui-tokens/assets/logo-mark.svg` (wheat head on olive circle), canonical source for web/native Icon, Expo app icon, splash, favicons. `BRAND.md` §logo text is stale ("replace when designed") — doc fix, plus optional brand-polish review in a future pass.
9. ~~Onboarding flow not in `DESIGN.md`~~ — **resolved**: documented (bare-shell decision, `DESIGN.md §11.1`), `OnboardingProgress` shipped web + native.
10. **No motion vocabulary doc** — **still open, narrowed**: `tokens.motion` (durations + stagger) and `useStagger` exist in code, but choreography (page enter, list stagger, optimistic feedback) is undocumented. See Pass 2 ask.

## Resolved repo addenda

- ~~PWA manifest hardcodes hex~~ — tokenized (no hex literals in `manifest.ts`).
- ~~Toast missing from spec inventory~~ — Toast shipped web + native and is in the shared index.
- ~~Dev "1 error" overlay~~ — fixed in the bug cascade recorded in `08-pain.md` v2.

## Open (Pass 2 targets)

1. **Post-critique surfaces have no design review.** `/me/premium` (plan comparison + checkout: card redirect, bank-transfer IBAN, Karama points, wallets coming-soon), invoices/receipts, `/saved`, and the public company route shipped after the 2026-05-21 critique. No critique scores, no pain walk, no mocks. These are the revenue surfaces.
2. **Operator UX on admin `/moderation` + `/billing`.** Sprint 25 hardened correctness (conflict states, audit trail, denied states); layout/flow was engineering-composed and flagged in the handoff as needing a design-platform pass.
3. **Motion vocabulary doc** (from #10 above) — document the existing token values into a choreography contract; small, systemic.
4. **BRAND.md logo section stale** — align text with the shipped wheat mark (doc-only).

## See also

- `08-pain.md` — v3 re-verification + v2 history.
- `10-ask.md` — Pass 2 ask built from the open items above.
- `docs/design/open-design-screen-critique.md` — per-route scores (2026-05-21; pre-premium/saved/company).
