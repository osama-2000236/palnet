# Claude Design brief — Baydar Design System v2 (interaction quality, accessibility, motion)

> **Verified against:** `main` @ `a4fcaa5` — "Opus 5 launch-readiness review" (#93,
> merged 2026-07-25 21:51 +0300). #93 touched **no file** in `packages/ui-web`,
> `packages/ui-native`, or `packages/ui-tokens`; every citation below was
> re-checked against the tree _after_ that merge. Contrast ratios are computed
> from the shipped token hex values, not estimated.
>
> **How to use:** paste everything below the line into Claude Design with the
> Baydar design system open. Read PART 0 before anything else — it lists shipped
> fixes that this work must not undo.

---

## Why this brief exists, given the green dashboard

The repo's own launch review (`docs/audit/OPUS5-VERDICT-2026-07-25.md`) reports
Lighthouse **accessibility 100** on four URLs — `/ar-PS`, `/en`, `/ar-PS/login`,
`/ar-PS/register` — and its verdict says outright: _"Not done, and stated as such:
the 85-screen five-dimension rubric. The matrices are machine-verified, not
design-reviewed."_

Those four URLs are public pages that never mount `AppShell`, `Tabs`, `Switch`,
`Dialog`, `PostCard`, or `Sheet`. And Lighthouse's audit set does not test target
size (WCAG 2.5.8), keyboard operability of a custom tab list, focus visibility on
a `sr-only` input, or timing-adjustability of a toast. **The green score and the
defects below are both true.** This brief is the design review the verdict says
has not happened.

---

## PART 0 — Regression guard: do not undo these

Each of these is a shipped fix with a documented root cause. A redesign that
reverts one is a net loss, no matter how much better it looks.

| Shipped decision                                                                                                                  | Evidence                                                                                                                                               | Why it must survive                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PostCard` has **four** actions, not five. Share/send was **deleted** because no public post permalink exists on either platform. | `docs/design/vision-qa-2026-07-23.md` §Pass 2.1; `packages/ui-web/src/PostCard.tsx:237–260`                                                            | The rule in `PostCard.types.ts` is the project's own: _"a glyph that does nothing is worse than no glyph."_ Do not re-add a fifth action for visual balance.                                                                                                                                      |
| `repost` and `save` render **only** when the host wires a handler.                                                                | Same; `PARITY.md` "Handler parity is clean as of 2026-07-25"                                                                                           | Web shipped two dead buttons (`onClick={undefined}`) for months. The guard is the fix.                                                                                                                                                                                                            |
| Action labels are `sr-only` below `sm` on web; native hides labels past three actions, keeping `accessibilityLabel`.              | vision-qa finding #6; `PostCardAction.tsx:39`                                                                                                          | Five labelled actions overflowed the card at 390px in Arabic. Any new label treatment must be re-measured at 390px in `ar-PS`.                                                                                                                                                                    |
| List surfaces use `flat` container + `row` items — `/network`, `/saved`, `/jobs`, `/moderation`, `/billing`.                      | PR #89; vision-qa §Follow-up                                                                                                                           | Per-row `card` was the flattening bug: nothing outranked anything. Do not return to it.                                                                                                                                                                                                           |
| All four commit actions (post, send, apply, connect-confirm) are `accent`.                                                        | PR #89; `DESIGN.md` §6.7                                                                                                                               | The olive/terracotta split was inconsistent; this settled it.                                                                                                                                                                                                                                     |
| `dir="auto"` on user-content leaves + the `bidi-plaintext` utility.                                                               | vision-qa findings #2 and §Follow-up                                                                                                                   | **Trap:** the utility is deliberately _not_ named `text-…`. tailwind-merge treats any `text-…` class as a text colour and silently drops it when a colour class follows in the same `cx()` call. Do not rename it, and do not introduce new utilities whose names collide with a Tailwind prefix. |
| Arabic-Indic digits everywhere via `formatNumber` / injected `formatCount`.                                                       | vision-qa finding #1; PR #88                                                                                                                           | See A2.14 — the `Tab` badge is the one place this was missed. Fix it the same way, do not invent a third way.                                                                                                                                                                                     |
| Inputs inside flex rows need `min-w-0`.                                                                                           | OPUS5 P1-5: `/me/edit` rendered 526px in a 390px viewport because flex items default to `min-width:auto` and an `<input>` will not shrink below ~200px | Any change to `Input` sizing must preserve this or the overflow returns.                                                                                                                                                                                                                          |
| Nav edge-fade mask at 390px; back arrows mirrored with `rtl:rotate-180`.                                                          | vision-qa findings #7, #9                                                                                                                              | Both are RTL correctness, not decoration.                                                                                                                                                                                                                                                         |

---

## Role and objective

You are upgrading **Baydar** (بيدر), an Arabic-first, RTL-by-default professional
network shipping as a Next.js web app (`packages/ui-web`) and an Expo React Native
app (`packages/ui-native`) from one Turborepo, both consuming `packages/ui-tokens`.

The kit is _correct but flat_: it has tokens, a warm-dark theme, and basic ARIA,
but its controls are prototype-grade — no state layers, no press physics, a toggle
that teleports, sub-minimum touch targets, a grabber that doesn't drag, and
several measurable accessibility failures.

**Objective:** raise every interactive primitive to the interaction quality users
expect from a first-tier social product (Instagram, LinkedIn, X, Threads) —
without copying their visual identity — while closing the verified defects below.
Baydar stays olive/terracotta, warm, Arabic-first, and visually distinct from
LinkedIn.

## Non-negotiable constraints

1. **Tokens are the only source of truth.** No raw hex, px, ms, or cubic-bezier in
   component code. Add the token in `packages/ui-tokens/src/index.ts` first, then
   consume it. `pnpm lint:tokens` and `pnpm qa:design` enforce this.
2. **RTL-safe only.** Logical properties on web (`start`/`end`, `ms-`/`me-`,
   `ps-`/`pe-`); `marginStart`/`marginEnd`/`start`/`end` on native. Motion may not
   translate on X unless explicitly mirrored for `I18nManager.isRTL` / `[dir="rtl"]`.
3. **Arabic first.** Every string ships `ar` first. Control heights and line
   heights must survive long Arabic labels and OS large-text settings without
   clipping or auto-shrinking. Every number a user sees goes through the locale
   formatter.
4. **Web and native stay in lockstep.** Same component name, same variant names,
   same prop vocabulary (`docs/design/PARITY.md`). A web-only improvement is an
   incomplete deliverable.
5. **Shared UI is framework-neutral.** No `next/*` or Expo Router imports inside
   `packages/ui-*`. Note `packages/ui-web` depends only on `ui-tokens`, `clsx`, and
   `tailwind-merge` — locale behaviour is _injected_, never imported (A1.6).
6. **Baydar is not LinkedIn.** Where a decision would converge on LinkedIn's UI,
   take the other option.

---

## PART A — Verified defect ledger

### A1. Token and theming violations

| #    | Evidence                                                                                                                                                                      | Problem                                                                                                                                                                                                                                                                                                                                                                               | Required outcome                                                                                                                                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1.1 | `packages/ui-web/src/Switch.tsx:54`                                                                                                                                           | Thumb is `bg-white` — the only hardcoded colour left in either kit (`grep` for hex/`bg-white`/`text-white` across both `src` trees returns this one line). In dark mode the web thumb stays pure white while the native thumb (`ui-native/src/Switch.tsx:66`, `c.inkInverse`) turns near-black. Same component, opposite colour, per platform.                                        | One tokenized thumb colour resolving correctly in both themes on both platforms.                                                                                                                                                                                                                                      |
| A1.2 | `packages/ui-native/src/AppShell.tsx:200` — `StyleSheet.create` reads `nativeTokens.color.*` at module scope (lines 203, 215, 231, 238, 258, 269, 279)                        | `StyleSheet.create` evaluates once at import. These colours are frozen to the light palette; the dynamic path is `useThemeTokens()`. **The native app shell does not re-theme in dark mode.**                                                                                                                                                                                         | Colours resolved at render from `useThemeTokens()`. Same audit for the 14 files using `StyleSheet.create`: `AppHeader`, `ComposerEntry`, `EmptyState`, `OnboardingProgress`, `PostCard`, `RecordCard`, `RecordCardSkeleton`, `SearchField`, `SegmentedControl`, `Sheet`, `StateMessage`, `Toast`, `safety.styles.ts`. |
| A1.3 | `packages/ui-native/src/AppShell.tsx:222, 237, 261, 283, 288`                                                                                                                 | `marginLeft` / `marginRight` in an RTL-default product — they push the wrong way in Arabic. Violates `docs/design/RTL.md`. Note line 242 in the same block already uses `marginStart`, so this is drift, not a convention.                                                                                                                                                            | `marginStart` / `marginEnd`, plus a lint rule that fails on physical direction props in `packages/ui-native`.                                                                                                                                                                                                         |
| A1.4 | Same file: `paddingHorizontal: 12`, `borderRadius: 20`, `fontSize: 18/13/11`, `width/height: 32`                                                                              | Raw numerics bypassing `nativeTokens.space` / `radius` / `type.scale`.                                                                                                                                                                                                                                                                                                                | All spacing, radii, type from tokens.                                                                                                                                                                                                                                                                                 |
| A1.5 | `Dialog.tsx` uses `z-[1000]`; `Toast.tsx` uses `z-[100]`; `AppShell.tsx:57` uses `z-20`                                                                                       | No layering scale exists — stacking is decided ad hoc. A toast raised over a modal is currently undefined behaviour.                                                                                                                                                                                                                                                                  | A `tokens.z` scale (`base`, `sticky`, `nav`, `dropdown`, `sheet`, `modal`, `toast`, `tooltip`); migrate every hardcoded z-index.                                                                                                                                                                                      |
| A1.6 | `packages/ui-web/src/OnboardingProgress.tsx:24` **and** `packages/ui-native/src/OnboardingProgress.tsx:20` both declare `const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩"` and a local `toAr()` | The same Arabic-digit table is copy-pasted into two packages, while `@baydar/shared` already owns `formatNumber` (which does it properly via the `-u-nu-arab` locale extension, `format.ts:43–58`). Three different answers to one question now live in one kit: `AppShellNav` takes an injected `formatCount`, `OnboardingProgress` hand-rolls a table, `Tabs` does nothing (A2.14). | **One** convention: the injected-formatter prop, matching `formatBadge(count, formatCount)` in `AppShell.constants.ts`. The kit cannot import `@baydar/shared` without breaking constraint 5 — that is _why_ the prop pattern exists. Delete both `AR_DIGITS` tables.                                                 |

### A2. Accessibility failures

| #     | Evidence                                                                                                                                                   | Problem                                                                                                                                                                                                                                                                                                                                                                                         | Required outcome                                                                                                                                                                                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2.1  | `packages/ui-web/src/RadioGroup.tsx:59–67`                                                                                                                 | The `<input type="radio">` is `sr-only`, so keyboard focus lands on an invisible element — **the visible pill shows no focus indicator at all.** WCAG 2.4.7 failure on a control used in onboarding.                                                                                                                                                                                            | `peer` + `:focus-visible` on the input drives a visible ring on the label pill. Native twin needs an equivalent.                                                                                                                                                                                                                                                                  |
| A2.2  | `RadioGroup.tsx:41` (`<fieldset>` + `<legend>`) vs `:43` (`role="radiogroup"` on an inner `<div>`)                                                         | The ARIA group has no accessible name — the legend belongs to the fieldset, not to the div carrying the role.                                                                                                                                                                                                                                                                                   | Drop the redundant role, or move it and wire `aria-labelledby` to the legend.                                                                                                                                                                                                                                                                                                     |
| A2.3  | `packages/ui-web/src/Tabs.tsx:49`                                                                                                                          | Roving `tabIndex` is implemented (`tabIndex={active ? 0 : -1}`) but **no keyboard handler exists** — Arrow / Home / End do nothing, so inactive tabs are unreachable by keyboard. This is strictly worse than no roving tabindex. No `aria-controls`, no `id`, no exported `TabPanel`.                                                                                                          | Full APG tabs pattern: Arrow Start/End (RTL-aware), Home, End, `aria-controls` ↔ `aria-labelledby`, exported `TabPanel` with `role="tabpanel"` and `tabIndex={0}`.                                                                                                                                                                                                               |
| A2.4  | `Tabs.tsx:60`                                                                                                                                              | The count badge is `aria-hidden="true"` — screen-reader users never learn there are 12 message requests.                                                                                                                                                                                                                                                                                        | Count in the tab's accessible name; badge stays decorative.                                                                                                                                                                                                                                                                                                                       |
| A2.14 | `Tabs.tsx:66` renders `{count}` **raw**                                                                                                                    | The one raw number render left in `ui-web` (`AppShellNav.tsx:183` correctly routes through `formatCount`). Live consumers: `ProfileTabsContent.tsx:33,36,39` (experience / education / skills counts) and `InboxList.tsx:71` (message requests). **On `/in/[handle]` in `ar-PS` these render Latin digits inside an Arabic-Indic UI** — exactly the class of leak PR #88 fixed everywhere else. | `Tab` takes `formatCount?: (n: number) => string` like `AppShell` does (`AppShell.tsx:21`), defaulting to `String`; the app supplies the locale-aware one. Same fix serves A2.4.                                                                                                                                                                                                  |
| A2.5  | `packages/ui-web/src/Input.tsx:89`                                                                                                                         | `helperId` is computed only `if (id)` — a consumer that omits an explicit `id` gets an error message **not** linked by `aria-describedby`. Silent failure. `Checkbox.tsx` does it right with `useId()`.                                                                                                                                                                                         | `useId()` fallback, matching `Checkbox`.                                                                                                                                                                                                                                                                                                                                          |
| A2.6  | `Input.tsx` error path                                                                                                                                     | Validation messages are static text — no `role="alert"` / `aria-live`, so a submit-time error is never announced.                                                                                                                                                                                                                                                                               | Announce politely; `aria-invalid` + `aria-errormessage` wired.                                                                                                                                                                                                                                                                                                                    |
| A2.7  | `Input.tsx:119`                                                                                                                                            | Focus ring is `focus-visible:` only, so clicking into a text field produces no ring — users lose the active field in a long form.                                                                                                                                                                                                                                                               | Text inputs use `:focus`; buttons and non-text controls keep `:focus-visible`.                                                                                                                                                                                                                                                                                                    |
| A2.8  | No skip link anywhere in `apps/web/src` (`grep` for `href="#"`, `focus:not-sr-only`, `#main`, `#content` returns nothing), and no `<main>` carries an `id` | **Correction to an earlier draft: the `<main>` landmark does exist** — 49 files render one, including every `(app)` route. Landmark navigation works for screen readers. The gap is _sighted keyboard users_: `AppShell` puts 11 tab stops ahead of content on every page — logo button, search input, 8 `NAV_ITEMS` (`AppShell.constants.ts:8–15`), profile menu — with no way past them.      | An Arabic skip link ("تخطي إلى المحتوى") as the first focusable element, and an `id` on the page `<main>` for it to target.                                                                                                                                                                                                                                                       |
| A2.9  | `packages/ui-native/src/Checkbox.tsx:86`                                                                                                                   | The checkmark is the literal text glyph `✓` — renders differently per platform/font and can fall back to tofu.                                                                                                                                                                                                                                                                                  | Use the shared `Icon` primitive, with an `indeterminate` state to match web. **Note:** web's `indeterminate` is live in production (`/moderation` select-all, `moderation/page.tsx:145`); native's `Checkbox` renders on **no** screen at all (see A5). Decide whether to wire it or narrow the parity claim — do not polish a component that nothing mounts and call it shipped. |
| A2.10 | `packages/ui-native/src/Button.tsx:161`                                                                                                                    | `numberOfLines={1} adjustsFontSizeToFit` shrinks the label instead of wrapping. Under OS large-text or a long Arabic label the button becomes unreadable rather than taller.                                                                                                                                                                                                                    | Dynamic Type support: allow 2 lines and grow the control; cap with `maxFontSizeMultiplier`; never shrink below the minimum readable size.                                                                                                                                                                                                                                         |
| A2.11 | `packages/ui-web/src/Toast.tsx:46` (`AUTO_DISMISS_MS = 3500`)                                                                                              | Fixed auto-dismiss, no pause on hover or focus, no extension. WCAG 2.2.1 risk, and Arabic toast copy takes longer to read.                                                                                                                                                                                                                                                                      | Pause on hover/focus and under `prefers-reduced-motion`; a toast with an action never auto-dismisses; cap the visible stack at 3 and queue the rest.                                                                                                                                                                                                                              |
| A2.12 | `Dialog.tsx:172` renders the ASCII letter `"x"`, while `Toast.tsx:73` uses `<Icon name="x" />`                                                             | Inconsistent, and it reads as the letter "x" at high zoom.                                                                                                                                                                                                                                                                                                                                      | Use `Icon`; sweep for other literal-glyph icons.                                                                                                                                                                                                                                                                                                                                  |
| A2.13 | `Dialog.tsx:149`                                                                                                                                           | `aria-label={title}` duplicates the visible `<h2>` instead of `aria-labelledby`.                                                                                                                                                                                                                                                                                                                | `useId()` + `aria-labelledby`; `aria-describedby` auto-wired to the description.                                                                                                                                                                                                                                                                                                  |
| A2.15 | `Dialog.tsx:66–79`                                                                                                                                         | The focus-restore effect only runs its `else` branch when `open` flips to `false`. If a consumer **unmounts** the dialog while open, cleanup clears a timeout and nothing restores focus — it falls to `<body>`. Latent today (the single consumer, `settings/account/page.tsx:161`, toggles `open` rather than unmounting) but a trap for every future consumer.                               | Restore focus in cleanup, not in the next effect run. Also: the dialog is documented as portal-less (`Dialog.tsx:13–14`), so any ancestor with `transform` or `overflow` will break its `position: fixed`. Move to a portal as part of the redesign.                                                                                                                              |

### A3. Touch and pointer targets — the most systemic defect

`CLAUDE.md` mandates 44pt (mobile) / 40px (web). Measured:

| Component           | Evidence                                                       | Actual                                              | Verdict                                     |
| ------------------- | -------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------- |
| Web `Switch`        | `Switch.tsx:46` — `h-5 w-9`                                    | **20 × 36 px**                                      | Fails. The most-tapped control in Settings. |
| Web `Checkbox`      | `Checkbox.tsx:85` — `h-4 w-4`                                  | **16 × 16 px** (label extends it horizontally only) | Fails.                                      |
| Web `Button` `sm`   | `Button.tsx:48` — `h-7`                                        | **28 px**                                           | Fails.                                      |
| Web `Input` `sm`    | `Input.tsx:48` — `h-7`                                         | **28 px**                                           | Fails.                                      |
| Web `Chip`          | `Chip.tsx:50–51` — `h-6` / `h-7`                               | **24 / 28 px**                                      | Fails.                                      |
| Web `Dialog` close  | `Dialog.tsx:170` — `h-8 w-8`                                   | **32 px**                                           | Fails.                                      |
| Web `Toast` dismiss | `Toast.tsx:71` — `h-7 w-7`                                     | **28 px**                                           | Fails.                                      |
| Native `Checkbox`   | `Checkbox.tsx:65–66` — 16pt box, `hitSlop={10}` (`:55`)        | **36 pt** vertically                                | Fails.                                      |
| Native `Switch`     | `Switch.tsx:45` — 20pt track, `hitSlop={12}`                   | 44 pt                                               | Passes.                                     |
| Native `Button`     | `Button.tsx:52,146` — `hitSlop` derived from `SIZE_HIT_TARGET` | 44 / 48 pt                                          | **Passes — copy this pattern.**             |

**Required:** a `tokens.target` scale (`min: 44`, `compact: 40`) and a web
equivalent of native's `hitSlop` — a transparent `::before` pseudo-element or a
`<TargetArea>` wrapper that expands the pressable area **without changing
layout**, so the visual density the design already earned is preserved. Then no
control in either kit is under the minimum at any size.

### A4. Interaction quality

| #    | Evidence                                                                                                                                                                                       | Problem                                                                                                                                                                                                                                                                                             | Required outcome                                                                                                                                                                                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A4.1 | `packages/ui-native/src/Switch.tsx:67`                                                                                                                                                         | The thumb jumps — `transform: translateX` with **no animation**. Web animates (`transition-transform`); native does not. A dead toggle is the clearest "unfinished app" signal there is.                                                                                                            | Spring thumb (Reanimated) + track crossfade, tokenized, RTL-mirrored via `I18nManager.isRTL`.                                                                                                                                      |
| A4.2 | `Animated` appears in exactly one native component (`Skeleton.tsx`); `docs/design/MOTION.md` §Native states plainly that `nativeTokens` carries no motion section                              | The mobile app has no transitions at all: no press feedback beyond opacity, no sheet spring, no list entrance, no tab change.                                                                                                                                                                       | Port `tokens.motion` into `nativeTokens`, then build the native motion layer.                                                                                                                                                      |
| A4.3 | Zero occurrences of `Haptics` / `expo-haptics` in `packages/ui-native` or `apps/mobile`                                                                                                        | No tactile feedback anywhere. `HANDOFF.md` lists real-device haptics evidence as owed since Sprint 11.5 — there is nothing to gather.                                                                                                                                                               | `useHaptics()` with semantic levels (`selection`, `impactLight`, `success`, `warning`, `error`), respecting the OS reduce setting; wired into Switch, Checkbox, reactions, pull-to-refresh, destructive confirms.                  |
| A4.4 | Zero occurrences of `isReduceMotionEnabled` / `AccessibilityInfo` in `packages/ui-native`; web honours it at `apps/web/src/app/globals.css:62`                                                 | Any motion added to native ships unguarded to vestibular-sensitive users.                                                                                                                                                                                                                           | A `useReducedMotion()` hook in `ui-native`, consumed by every animated primitive. **Prerequisite for A4.1 / A4.2 — build it first.**                                                                                               |
| A4.5 | `Button.tsx:35–44` (`VARIANT_CLASSES`)                                                                                                                                                         | Hover/press is hand-written per variant, so intensity drifts between Button, Chip, Tab, PostCardAction, and list rows.                                                                                                                                                                              | A **state layer** contract: tokenized overlay opacities for `hover` / `pressed` / `selected`, applied identically by every interactive surface on both platforms.                                                                  |
| A4.6 | `packages/ui-web/src/PostCardAction.tsx:29–35`                                                                                                                                                 | The product's primary social action is a `transition-colors` text swap — no press scale, no burst, no count transition.                                                                                                                                                                             | Design the reaction as Baydar's signature micro-moment: press-in scale, spring release, icon fill, count transition, haptic on native. One element, tokenized, reduced-motion safe. Stay inside the four-action contract (PART 0). |
| A4.7 | `Toast.tsx`, `Dialog.tsx`                                                                                                                                                                      | Both mount and unmount instantly — the dialog appears as a hard cut.                                                                                                                                                                                                                                | Tokenized enter/exit: scrim fade + dialog rise/scale; toast slide from the block edge, swipe-to-dismiss on native.                                                                                                                 |
| A4.8 | `Tabs.tsx:52`                                                                                                                                                                                  | The active underline is a static `border-b-2` swap — no travelling indicator.                                                                                                                                                                                                                       | Animated indicator, RTL-correct, disabled under reduced motion.                                                                                                                                                                    |
| A4.9 | `packages/ui-native/src/Sheet.tsx:93–94` renders a grabber; the file header at `:14` claims _"swipe the handle area to close"_ — there is **no** `PanResponder` or gesture handler in the file | **The grabber is an affordance lie.** Users will drag it and nothing will happen. By the project's own rule — _"a glyph that does nothing is worse than no glyph"_ — it is either wired or removed. Motion is `Modal animationType="slide"`, an OS animation outside the tokenized motion contract. | Drag-to-dismiss with detents (the header already names `@gorhom/bottom-sheet` as the intended v2 and says the public API is a deliberate subset), or delete the grabber. Sheet motion moves onto the motion tokens.                |

### A5. Cross-platform parity

Audited against both barrel files, post-#93:

- **Web-only, no native twin:** `Alert`, `Composer` (native ships the differently-named `ComposerEntry`), `ProfileHeader`, `RoomRow`, `Tabs`, `TypingIndicator`, `useStagger`.
- **Native-only, no web twin:** `AppHeader`, `RecordCard`, `RecordCardSkeleton`, `SearchField`, `SegmentedControl`, `Sheet`, `StateMessage`.
- **Prop drift:** web `Checkbox` uses `onCheckedChange` (`Checkbox.tsx:27`); native uses `onChange` (`Checkbox.tsx:17`).
- **Capability drift:** web `Checkbox` supports `indeterminate` (`Checkbox.tsx:23`, live on `/moderation`); native does not. Native `SegmentedControl` has no count/badge support, so `Tabs` ↔ `SegmentedControl` is not a rename — it is a feature gap.
- **Shape drift:** web `Button` is `rounded-md` = 10px (`Button.tsx:74`); native `Button` is `radius.full` = pill (`Button.tsx:111`). **The same button is a rounded rectangle on web and a pill on mobile.** Decide which is Baydar and apply it to both.
- **Missing on both sides:** `Input.tsx:10` documents "for multi-line, use `<Textarea>`" — `Textarea` exists in neither barrel.
- **#93's own finding, adopt it:** `Checkbox` (120 LOC), `Dialog` (79 LOC), `OnboardingProgress` (176 LOC) ship in the native barrel and are **mounted by nothing**. `OnboardingProgress` matters most — mobile _has_ an onboarding flow (`app/(app)/_onboarding/`) and doesn't use it, so web shows step progress and mobile doesn't. That is a screen-parity gap, not an idle export. Likewise `Illustration`: no mobile screen passes `direction`, so `OutlineSet` and `BlockSet` (~210 lines of `react-native-svg`) are unreachable on native.

**Required:** one reconciled matrix — _shared_, _platform-only by design_ (with a
written reason), or _to be built_ — replacing the table in `docs/design/PARITY.md`,
which still marks several of these "Good".

### A6. Colour contrast — computed, not estimated

Ratios below are calculated from the shipped hex values in
`packages/ui-tokens/src/tokens.css`. The dark-theme block in that file carries the
comment _"Semantic — success + danger re-lit; warning + info read fine as-is."_
**That comment is measurably wrong.**

| Pair                                                      | Where it renders                                                                                                                                                                | Light      | Dark                               | Needs             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------- | ----------------- |
| `--ink-subtle` on `--surface`                             | Input placeholder (`Input.tsx:116`), leading/trailing icons (`:100`, `:138`), disabled input text (`:129`), `OnboardingProgress` counter (`:77`, `:139`), native `Input.tsx:94` | **3.55** ✗ | **4.14** ✗                         | 4.5               |
| `--ink-subtle` on `--surface-subtle`                      | Same tokens on a tinted surface                                                                                                                                                 | **3.08** ✗ | **3.68** ✗                         | 4.5               |
| `--warning` text on its own 10% tint                      | `Alert.tsx:47`, `Banner.tsx:36`, native `Banner.tsx:31`                                                                                                                         | **3.33** ✗ | **3.77** ✗                         | 4.5               |
| `--info` text on its own tint                             | `Alert.tsx:45`, `Banner.tsx:35`, native `Banner.tsx:30`                                                                                                                         | 4.97 ✓     | **2.55** ✗ (Banner soft: **2.61**) | 4.5               |
| `--danger` text on its own tint                           | `Alert.tsx:48`, `Banner.tsx:37`                                                                                                                                                 | 5.64 ✓     | **4.18** ✗ (Banner soft: **3.95**) | 4.5               |
| Toast `info`: `--ink-inverse` on `--info`                 | `Toast.tsx` kind=`info`                                                                                                                                                         | 5.71 ✓     | **3.05** ✗                         | 4.5               |
| Switch OFF track (`--surface-sunken`) against `--surface` | `Switch.tsx:48`                                                                                                                                                                 | **1.23** ✗ | **1.28** ✗                         | 3.0 (WCAG 1.4.11) |

Passing, for reference — do not "fix" these: primary button label 6.83 / 5.15,
accent button 5.79 / 4.71, body ink 17.44 / 13.82, `--ink-muted` 6.91 / 7.25,
focus ring vs surface 6.83 / 4.69, active tab badge 8.69 / 6.12, success text
4.57 / 5.08.

**Required:** re-light `--ink-subtle`, `--warning`, and the dark `--info` and
`--danger` ramps; give the OFF switch track a perceivable boundary (a border, not
just a fill, since 1.23:1 cannot be rescued by any fill in this palette). Every
change is a token edit, so both platforms inherit it — but re-run the whole table
after, because these tokens are interdependent.

---

## PART B — What to design and specify

### B1. New tokens (before any component work)

- `tokens.state` — hover / pressed / selected overlay opacities, light + dark.
- `tokens.target` — `min: 44`, `compact: 40`.
- `tokens.z` — the layering scale from A1.5.
- `tokens.motion` ported into `nativeTokens`, plus spring configs (stiffness / damping / mass) for toggle, sheet, and press.
- `tokens.motion.duration.slower` — the scale stops at `slow: 240ms`, too short for a sheet or modal entrance.
- Re-lit semantic ramps from A6, plus a semantic switch-thumb token.
- Elevation: shadows are four fixed values (`card`, `pop`, `nav`, `modal`). Specify how elevation responds to hover/press, and how it reads in dark, where shadows are nearly invisible — dark elevation should lean on surface lightness, not shadow.

### B2. Control briefs (web **and** native for each)

**Switch** — the flagship. Legal target, spring thumb, track crossfade, a
perceivable OFF boundary (A6), state not conveyed by colour alone, disabled +
loading, RTL-mirrored travel, haptic on native, and a hidden form input on web so
it submits inside a `<form>` (the `name` prop declared at `Switch.tsx:24` is
applied to a `<button>` and does nothing today).

**Checkbox** — custom-rendered both platforms so the check can animate,
`indeterminate` on both, error state, full-row hit target, label alignment correct
for Arabic line height, one prop name across platforms.

**Radio / RadioGroup** — visible focus on the pill (A2.1), correct group naming
(A2.2), selected state not colour-only, arrow behaviour verified in RTL.

**Button** — settle the pill-vs-rounded drift, define the state layer for all six
variants, loading state that preserves width, a real `icon-only` size with an
enforced label, tokenized press physics.

**Input / Textarea / SearchField** — `:focus` ring for text fields, live error
announcement, `Textarea` built, `min-w-0` preserved (PART 0), a `SearchField`
clear button at a legal size, and a shared `Field` wrapper owning label / helper /
error so the three primitives stop diverging.

**Tabs / SegmentedControl** — APG keyboard support, animated indicator, injected
`formatCount` (A2.14), counts in the accessible name, scrollable overflow with an
edge affordance matching the nav's existing fade mask, and a naming + capability
decision between the two.

**Dialog / Sheet** — enter/exit motion, `aria-labelledby`, portal, focus restored
on unmount (A2.15), scroll lock that restores position, and a native sheet whose
grabber actually drags (A4.9).

**Toast** — pause on hover/focus, action support, stack cap with queueing,
swipe-to-dismiss on native, positioned clear of `--mobile-tab-h` / `nativeTokens.chrome.tabHeight` (64) and the
safe-area inset.

**Feed row / PostCardAction** — the reaction moment (A4.6) and a loading→loaded
crossfade instead of a hard skeleton swap. Four actions, handler-guarded,
`sr-only` labels below `sm` — all three are PART 0 constraints.

### B3. Motion choreography (revise `docs/design/MOTION.md`)

The current contract forbids nearly everything: "no decorative motion", "one
entrance per screen load", "vertical only", and it documents that native has no
motion tokens. That restraint is right for _decoration_ and wrong for _feedback_.
Rewrite it in four bands:

- **Feedback** (press, toggle, selection, validation, reaction) — required, ≤ `--dur-base`, tokenized, reduced-motion guarded.
- **Transition** (sheet, dialog, tab indicator, navigation) — required, `--dur-slow` / new `--dur-slower`, spring where the surface is directly manipulated.
- **Entrance** (list stagger) — keep the existing single-entrance rule and the 6-item cap.
- **Decorative** — stays banned.

Keep "vertical only" as the default and enumerate the mirrored exceptions (switch
thumb, tab indicator, sheet drag) with the RTL rule spelled out for each. Every
new animation class goes into the `prefers-reduced-motion` block at
`apps/web/src/app/globals.css:62` and behind `useReducedMotion()` on native.

### B4. Mobile (`docs/design/MOBILE.md`)

Safe areas top and bottom; tab bar at `nativeTokens.chrome.tabHeight` with a legal
44pt target per item and an active-state animation; pull-to-refresh with a
brand-tokenized indicator and haptic; keyboard avoidance for composer and message
input; Dynamic Type to the largest OS setting without clipping Arabic; and a
swipe-back decision that does not collide with RTL swipe direction.

---

## PART C — Deliverables

1. **Updated design system** covering every control in B2, web and mobile, light and dark, with all states visible: default / hover / focus-visible / pressed / selected / disabled / loading / error / indeterminate.
2. **Token diff** — exact new and changed entries for `packages/ui-tokens/src/index.ts`, `tokens.css`, `tailwind-preset.ts`, `tokens.native.ts`, in each file's existing format, including the recomputed A6 ratios for every colour you touch.
3. **Motion spec sheet** — per interaction: trigger, property, duration token, easing token, RTL rule, reduced-motion fallback, native spring config.
4. **Reconciled parity matrix** replacing the stale table in `docs/design/PARITY.md`, incorporating #93's never-rendered findings.
5. **Per-defect implementation notes** — for each A1–A6 item, the file to touch and the intended change, written so an engineer implements without re-deriving the decision.
6. **Arabic-first specimens** — every control with real Arabic labels at realistic length, RTL, both themes, at 390px and desktop. English-only mockups do not constitute proof for this product.

## PART D — Acceptance criteria

- Every changed surface scores **≥7** on the project's five dimensions — philosophy / hierarchy / detail / functionality / restraint (`docs/design/screen-critique-2026-07.md`).
- No control in either kit is below 44pt / 40px — including `sm` sizes, chips, dismiss buttons, and switches.
- Every interactive element has a visible focus indicator **on the visible element**, ≥3:1 against its adjacent background in both themes.
- Every pair in the A6 table passes, and no currently-passing pair regresses.
- No state conveyed by colour alone (switch, chip selected, tab active, error).
- `pnpm lint:tokens`, `pnpm qa:design`, `pnpm format:check`, `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm check:release-placeholders` all pass.
- `apps/web/e2e/a11y.spec.ts` (axe) passes, extended to cover: Tabs keyboard navigation, Dialog focus trap and focus restore, RadioGroup focus visibility, Toast live regions and pause-on-hover, and the skip link.
- Re-shoot with the existing harnesses and diff: `apps/web/e2e/shots.mjs` (46 routes × locale × theme × viewport) and `apps/mobile/e2e/shots.mjs` (38 screens). The mobile harness is how A1.2 gets proven — dark-mode native chrome must visibly change.
- Native dark mode verified on device after A1.2. Every animation has a reduced-motion fallback on both platforms. No physical-direction CSS or style props remain in `packages/ui-*`.

## PART E — Out of scope

- Do not redesign the brand palette's _identity_, the typography stack, or the warm-dark concept (`DESIGN.md` §5, `BRAND.md`). A6 re-lights specific ramps for contrast; that is not a palette redesign.
- No decorative motion: no parallax, no looping ornaments, no confetti, no attention bounces. Loops are status-only (skeleton pulse, typing dots).
- No second decorative gradient — `--cover-gradient` is the only one (`DESIGN.md` §13).
- Do not flatten the five surface variants (`flat`, `card`, `hero`, `tinted`, `row`) into one card style, and do not revert the flat-list composition (PART 0).
- No new web animation library — Tailwind keyframes plus motion tokens. Reanimated only on native.
- Do not converge on LinkedIn's layout or component language.

---

## Implementation traps (documented, each cost a debugging cycle)

- **`packages/ui-web` edits need a dev-server restart.** The web app consumes the kit as source (`main: ./src/index.ts`); a running `next dev` keeps serving the pre-edit module and the new class is simply absent from the DOM.
- **`apps/web/messages/*.json` edits need `rm -rf apps/web/.next`.** A restart is not enough — `t()` renders the key path with a `MISSING_MESSAGE` console error while the JSON on disk is fine.
- **tailwind-merge drops `text-…` classes.** Any utility whose name starts with a Tailwind prefix can be silently removed when a real colour class follows in the same `cx()` call. This disabled the bidi fix on one surface while an identical plain-`className` surface worked. Confirm by reading computed style, not by looking at a screenshot.
- **`pnpm e2e` fails in parallel, passes serially** (33 failed / 14 passed vs 51 / 0 with `--workers=1`) — one shared QA database. Not your bug; don't chase it.

### Reference reading

`CLAUDE.md` · `DESIGN.md` · `BRAND.md` · `docs/design/RTL.md` · `MOBILE.md` ·
`MOTION.md` · `PARITY.md` · `NAV.md` · `screen-critique-2026-07.md` ·
`vision-qa-2026-07-23.md` · `docs/audit/OPUS5-{VERDICT,REVIEW}-2026-07-25.md` ·
`docs/_archive/prototype-2025/Baydar Prototype.html` (visual ground truth) ·
`design-handoff-2026-06/README.md`

_Audited against `main` @ `a4fcaa5`, 2026-07-25. Line numbers refer to that tree._
