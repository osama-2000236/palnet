# TESTING.md — how to verify UI/UX reaches "100%"

> Location: `docs/design/TESTING.md`.
> A definition-of-done checklist for every screen and every component.

## Levels of testing

### 1. Token lint (automated)

Script: `pnpm lint:tokens` — greps `apps/*/src/**` and `packages/ui-web/src/**` for:

- Hardcoded hex colors (`#[0-9a-f]{3,8}` not in a token file) → fail.
- Raw `px` values outside spacing scale (except 1px borders) → fail.
- Physical CSS props (`margin-left`, `padding-right`, `left:`, `right:` in stylesheets) → fail.
- `bg-blue-*`, `text-slate-*`, `ring-indigo-*` Tailwind defaults → fail.

Runs in CI on every PR.

### 2. Component unit (automated)

Each component in `packages/ui-web/src/*` has a co-located `*.test.tsx` using Vitest + React Testing Library.

Minimum tests per component:

- Renders all variants without throwing.
- Fires `onClick` / `onPress`.
- Respects `disabled`.
- Has accessible name (for interactive components).

### 3. Visual regression (automated, per component)

Storybook (web) + snapshot each component in every variant × size × state × direction (ltr + rtl). Use `@storybook/test-runner` + Playwright.

One story = one screenshot baseline. PRs that change pixels require explicit review.

### 4. Screen-level interactive (manual, per screen)

For each of Feed / Profile / Network / Messages / Search, walk through this checklist:

**Layout**

- [ ] Renders correctly at `375` (mobile), `768` (tablet), `1024`, `1440` widths.
- [ ] No horizontal scroll at any width.
- [ ] Sticky elements stick; scrolling content scrolls.

**RTL**

- [ ] With `<html dir="rtl">`, all icons on correct side, text starts at right.
- [ ] Toggle to `dir="ltr"` — layout still structurally sound even if copy is Arabic.
- [ ] No `left:` / `right:` / `ml-` / `mr-` / `pl-` / `pr-` found in `grep`.

**State — loading**

- [ ] Skeleton renders while data loads. Not a spinner.
- [ ] Skeleton structure matches real content shape.

**State — empty**

- [ ] Empty state has title + description + primary action. Not "No results."

**State — error**

- [ ] Network error toast is dismissible.
- [ ] Retry button works and doesn't double-fire.

**State — offline**

- [ ] Throttle network to Offline in devtools; no crashes, banner appears.

**Forms**

- [ ] Enter submits; Escape cancels modals.
- [ ] Client validation errors inline, not in a toast.
- [ ] Submit button disables while pending.

**Interactions**

- [ ] Every button has visible hover state.
- [ ] Every button has visible `:focus-visible` ring.
- [ ] Tabbing order matches visual reading order (right-to-left for RTL).

**Typography**

- [ ] No text smaller than 12px anywhere.
- [ ] No text truncated without `title` / tooltip.
- [ ] Line-height never tighter than 1.4 on Arabic body text.

### 5. Accessibility (semi-automated)

- `axe-core` runs via `@axe-core/playwright` on every screen story. Zero serious/critical violations.
- Manual screen-reader pass on each screen (VoiceOver on macOS, TalkBack on Android) — every interactive element has a meaningful label.
- Color contrast: `ink` on `surface` ≥ 7:1, `ink-muted` on `surface` ≥ 4.5:1. Verify with DevTools.

### 6. RTL translation QA (manual, native speaker)

- Every string reviewed by a native Arabic speaker for:
  - Correctness (no translation mistakes).
  - Register (professional but warm, not corporate).
  - Length (Arabic runs ~15% wider than English — check nothing overflows).
- Flag English leakage in any user-facing surface.

## Definition of done for a screen

A screen is "100%" when it passes:

1. ✅ Token lint green.
2. ✅ Component unit tests green.
3. ✅ Visual regression snapshots reviewed and committed.
4. ✅ Manual interactive checklist above completed (post Loom / screen recording in PR).
5. ✅ Accessibility scan clean.
6. ✅ Arabic translation reviewed.
7. ✅ Works offline (empty/cached fallback).
8. ✅ Works on iOS Safari + Chrome + Firefox (web); iOS + Android (mobile).
9. ✅ Designer signoff (comment on PR from designer).

## Smoke test on every build

Playwright script that, per app:

1. Signs in.
2. Loads Feed, scrolls.
3. Opens a profile.
4. Opens Messages, sends a message.
5. Logs out.

Must finish in < 60s with no console errors.

## Perf budget

- Feed initial render (TTI) ≤ 2s on 3G-fast throttle.
- First contentful paint ≤ 1.5s.
- JS bundle for feed route ≤ 250kb gzipped.
- Largest image ≤ 200kb (with blurhash placeholder).

## What "100% UI/UX" actually means

It's not pixel-perfection — it's **consistency + absence of friction**. A screen is done when:

- A new user understands what to do without reading instructions.
- No component looks subtly different from its counterpart elsewhere.
- The Arabic reads naturally to a native speaker.
- The screen still works when the user's internet is bad, their device is old, their fingers are big, or their language is English.

If you can't check all those boxes, you're not at 100%.
