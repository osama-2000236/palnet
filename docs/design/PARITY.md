# Cross-Platform Parity

`DESIGN.md` remains the source of truth. This file tracks how closely the shared
web and native UI kits match the Baydar contract.

Reconciled 2026-07-26 (design-system v2, ledger item A5). Replaces the previous
"Shared Primitive Matrix", which marked several of the rows below "Good".

## Rule

Web and native components share names, variant names, token intent, and prop
vocabulary whenever both platforms ship the component. Native uses `onPress`;
web uses `onClick`.

Preferred shared props: `variant`, `size`, `disabled`, `loading`, `leading`,
`trailing`, `label`, `helperText`, `error`, `selected`, `onClick` / `onPress`.

Back-compat aliases are allowed during migration, but new screen code should use
the preferred prop names.

Every component is one of three things and nothing else:

- **Shared** — exists on both, same prop vocabulary.
- **Platform-only by design** — exists on one, with a written reason below.
- **To be built** — a real gap, named as such.

A component that exists on one platform and is simply missing from the other,
without a reason on this page, is drift rather than a decision. That distinction
is the whole point of the file; "Partial" was not a status, it was a shrug.

## Counted, not estimated

**38 of 51 exports are shared**, counted from the two barrel files
(`packages/ui-web/src/index.ts`, `packages/ui-native/src/index.ts`) on
2026-08-08, not from memory. Both barrels export 51 names; 13 are web-only and
13 native-only, and every one of those 26 has a reason below.

Recount before quoting this number. It read 28 for three sprints while the kits
grew, which made "how far apart are we" unanswerable from the page whose job
that is.

## Platform-only by design

| Component                                       | Lives on | Why                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Menu`                                          | web      | A list anchored to a trigger is a pointer pattern. Native's counterpart is `ActionSheet`, same `items` vocabulary — the Dialog/Sheet split applied again.                                                                                                                                             |
| `ActionSheet`                                   | native   | Same.                                                                                                                                                                                                                                                                                                 |
| `ReactionPicker`                                | web      | The flyout is a hover/focus affordance. Touch long-presses the reaction action and gets `ActionSheet`; both platforms reach all six types.                                                                                                                                                            |
| `TabPanel`                                      | web      | `Tabs` and `Tab` are paired now — native was `SegmentedControl` and is not. Only the panel stays web-only: it exists to give `aria-controls` something to point at, and a native screen renders its section below the strip.                                                                          |
| `Dialog`                                        | web      | Native's equivalent is `Sheet`. A centred modal is not a mobile pattern; a bottom sheet is.                                                                                                                                                                                                           |
| `Sheet`                                         | native   | Same. Genuinely drag-dismissable as of A4.9.                                                                                                                                                                                                                                                          |
| `ReportDialog` / `ReportSheet`                  | split    | Same content, correct container per platform. Prop vocabulary matches.                                                                                                                                                                                                                                |
| `AppHeader`                                     | native   | Web's chrome is `AppShell`'s sticky header. Mobile screens each own a header because there is no persistent top bar.                                                                                                                                                                                  |
| `RoomRow`                                       | web      | Native renders a conversation through `RecordCard`, which is its list idiom. Listed as a shared component with undiffed props until the 2026-08-08 recount; it is not in the native barrel and never was.                                                                                             |
| `ComposerEntry`                                 | native   | The collapsed composer. Web's `Composer` has a collapsed state built in; mobile needs a separate entry point because composing is a pushed route.                                                                                                                                                     |
| `ThemeProvider` / `useTheme` / `useThemeTokens` | native   | Web re-themes through CSS variables under `.dark`, so there is nothing for a provider to do.                                                                                                                                                                                                          |
| `useReducedMotion`                              | native   | Web reads `prefers-reduced-motion` in CSS. Added 2026-07-26 (A4.4).                                                                                                                                                                                                                                   |
| `TypingIndicator`                               | web      | Mobile renders the same state inline in the thread.                                                                                                                                                                                                                                                   |
| `useStagger`                                    | web      | List entrance staggering. Native enforces `MOTION.md`'s single-entrance rule per screen instead.                                                                                                                                                                                                      |
| `Illustration` `outline` kit                    | web      | **Settled 2026-07-29.** DESIGN.md §7.5 makes `outline` the admin/operator register — `/moderation`, `/billing`. Mobile ships no admin surface, so the kit had no register there and 100 lines of unreachable `react-native-svg`; deleted per the same section. `harvest` and `block` are in lockstep. |

## To be built — real gaps

| Gap                                | Detail                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProfileHeader`, native            | Web-only. Mobile builds the profile header inline on the screen. The last component-level gap on this page.                                                                                                                                                                                                                                                             |
| `Tab` counts, native               | **Closed 2026-07-30.** Native's `Tab` takes `count` and native's `Tabs` takes `formatCount`, same contract as web's, and both `/network` strips now render the three connection counts `GET /connections/counts` had been serving to nobody. Zero draws nothing on both. Mobile `/in/[handle]` showing four tabs to web's five is unrelated and still open — see below. |
| `Checkbox` `indeterminate`, native | **Not a gap — settled 2026-07-29.** Web needs it for `/moderation`'s select-all; mobile ships no admin surface and no multi-select list, so native would carry a prop no screen can pass. Add it with the first native screen that selects many rows.                                                                                                                   |
| `Textarea` prop shape              | **Shipped on both, 2026-08-08 recount.** It was listed here as existing in neither barrel; it exists in both. The shapes have not been diffed since either side last changed — verify before treating as shared.                                                                                                                                                        |

## Shipped in both barrels, mounted by nothing

Empty as of 2026-07-29. Every row was closed by wiring the component or
deleting it, never by restating it:

- `OnboardingProgress` — mobile's onboarding rendered a local `StepDots`, which
  was this component with the `progressbar` role removed. Wired; the local copy
  is gone.
- `Dialog` — deleted from `ui-native`. `Sheet` is the mobile idiom and always
  was, so the export was a twin nothing could mount. Reason recorded above.
- `Toast` — **the entry was wrong.** `ToastProvider` renders `<Toast>` for every
  queued item, and eight mobile screens call `showToast`. What was genuinely
  dead is the `ToastHost` alias, on _both_ platforms; that is deleted.
- `Illustration` sets — see the `outline` row above.

## Prop drift

None open.

## Drift ledger

`scripts/check-ui-lockstep.mjs` reports **0 known drift entries** as of
2026-07-29. It had carried three since it was written, and had never shrunk.
Every component below is now Shared or Platform-only-with-a-reason; there is no
third category left. A new entry is an argument, not a reflex.

## Shape decisions

| Decision             | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button radius        | **Settled 2026-07-27 at `md` (10px) on both.** The pill is the category default (LinkedIn, X) and `CLAUDE.md` says take the other option where a decision would converge. Web keeps what it had; native moved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Switch thumb colour  | **Settled 2026-07-26.** One `switchThumb` token, light in both themes, with a border so it stays visible against the light OFF track. Web was hardcoded `bg-white`; native used `inkInverse`, near-black in dark — opposite colours.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Number formatting    | **Settled 2026-07-26.** One convention: an injected `formatCount` prop. `AppShell`, `Tab` and both `OnboardingProgress` twins use it; the two copy-pasted Arabic-digit tables are gone.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Motion tokens        | **Settled 2026-07-26.** `nativeTokens.motion` carries durations and spring configs, referenced from the canonical source rather than copied.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Avatar `blurhash`    | **Settled 2026-07-27.** `AvatarUser.avatarBlurhash` stays on both, because it is API data and both platforms accept the same user object. Only native _decodes_ it — expo-image does that for free and web has no decoder without a new dependency, which a 24–96px circle does not warrant. Web paints the initials chip underneath instead, so a slow or broken image degrades to initials rather than a grey hole. The dead `blurhash` **prop** on web's Avatar was deleted.                                                                                                                                                                                                                                                                                                                                                                                                   |
| Post action labels   | **Settled 2026-07-27.** Re-measured at 390px in `ar-PS`: four labelled actions want 308px of 340px available and nothing clips, so both platforms show labels. Native's icon-only threshold moved from `> 3` to `> 4`. Five would still overflow.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Alert / StateMessage | **Settled 2026-07-29.** One component, `Alert`, on both. Native's `StateMessage` was this under another name with `tone`/`message`/`actionLabel` against web's `kind`/`children`/`action`. The converged props are `kind` + `title` + `body` + `cta`/`onAction`/`busy` — `kind` because `Banner` and `Toast` already use exactly that union on both platforms, `body`/`cta`/`onAction` because `EmptyState` already used them on both. Web's dead `closable`/`onClose` and native's never-passed `icon` and `role` are gone; severity now derives the ARIA role on both. The **layouts stay different by design**: web draws a bordered inline strip, native a centred tinted block, because a phone column is not a desktop column. Native also has no severity icon — the native icon set has no status glyphs, and inventing three is a separate change with its own evidence. |
| Colour resolution    | **Settled 2026-07-26.** No colour in a module-scope `StyleSheet.create` on native — `lint:tokens` fails on it. Colours resolve at render from `useThemeTokens()`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Touch targets        | **Settled 2026-07-26.** `tokens.target` (`min: 44`, `compact: 40`). Web expands the pressable box with `.target-area` without changing layout; native derives `hitSlop` from the same token.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Boolean controls     | **Settled 2026-07-29.** `Checkbox` and `Switch` both take `checked` + `onChange(value: boolean)` on both platforms. `Switch` already did; web's `Checkbox` was the odd one out with `onCheckedChange`. Mobile's register consent field was a raw React Native `Switch` — the wrong control for consent, and outside the kit — and is the same `Checkbox` web ships now.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Screen-level parity

Tracked in `docs/audit/OPUS5-ROUND3-2026-07-26.md`, which scores all 38 mobile
screens against their web twins. Two gaps found there are screen-level rather
than component-level:

- `profile-public` renders four tabs on mobile against web's five (no النشاط).
  Not downstream of the `Tab` count gap, which is closed — the fifth tab has no
  count on either platform. Mobile is missing the activity surface itself.
- `network` and `me-connections` render the same screen on mobile; web treats
  them as two surfaces.

**Three web routes have no mobile twin at all.** Found 2026-07-29 by diffing the
route trees (45 web pages vs 39 mobile screens) rather than by component; still
open and unstarted at `main` @ `c8248a7` on 2026-07-30. Tracked in full in
`docs/HANDOFF.md` §"Open product gaps" — repeated here because they are parity
gaps, not missing features:

| Web route                                                             | Mobile | Why it matters                                                                                                                                                                      |
| --------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/legal/tos`, `/legal/privacy`, `/legal/community`, `/legal/employer` | none   | Mobile register enforces `acceptTerms` while linking to nothing, so the user agrees to documents the app gives them no way to read. Both stores require a reachable privacy policy. |
| `/cv`                                                                 | none   | Print-optimised résumé with correct RTL shaping, using the print dialog as the PDF exporter. One of the few things a job seeker opens the app specifically to do.                   |
| `/j/[id]`                                                             | none   | The public unauthenticated job page. A job shared into WhatsApp has nowhere to land on a phone.                                                                                     |

`(admin)/billing` and `(admin)/moderation` are also web-only and that is
deliberate — operator surfaces, not member ones.
