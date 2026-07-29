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

**28 exports are shared.** The lists below are generated from the two barrel
files (`packages/ui-web/src/index.ts`, `packages/ui-native/src/index.ts`), not
from memory.

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
| `SearchField`                                   | native   | Web search lives inside `AppShell`; mobile has no persistent shell to host it.                                                                                                                                                                                                                        |
| `RecordCard` / `RecordCardSkeleton`             | native   | The mobile list idiom. Web uses `Surface variant="row"` inside a `flat` container — the composition PR #89 settled on.                                                                                                                                                                                |
| `StateMessage`                                  | native   | Not a split — both packages export `EmptyState` and they are paired. This is web's `Alert` under another name. See the drift row below.                                                                                                                                                               |
| `ComposerEntry`                                 | native   | The collapsed composer. Web's `Composer` has a collapsed state built in; mobile needs a separate entry point because composing is a pushed route.                                                                                                                                                     |
| `ThemeProvider` / `useTheme` / `useThemeTokens` | native   | Web re-themes through CSS variables under `.dark`, so there is nothing for a provider to do.                                                                                                                                                                                                          |
| `useReducedMotion`                              | native   | Web reads `prefers-reduced-motion` in CSS. Added 2026-07-26 (A4.4).                                                                                                                                                                                                                                   |
| `TypingIndicator`                               | web      | Mobile renders the same state inline in the thread.                                                                                                                                                                                                                                                   |
| `useStagger`                                    | web      | List entrance staggering. Native enforces `MOTION.md`'s single-entrance rule per screen instead.                                                                                                                                                                                                      |
| `Illustration` `outline` kit                    | web      | **Settled 2026-07-29.** DESIGN.md §7.5 makes `outline` the admin/operator register — `/moderation`, `/billing`. Mobile ships no admin surface, so the kit had no register there and 100 lines of unreachable `react-native-svg`; deleted per the same section. `harvest` and `block` are in lockstep. |
| `Alert`                                         | web      | Mobile uses `Banner` for transient notices. For persistent ones it uses `StateMessage`, which is this component with different prop names — recorded as drift in `scripts/check-ui-lockstep.mjs`, not a deliberate split.                                                                             |

## To be built — real gaps

| Gap                                | Detail                                                                                                                                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Textarea`, both platforms         | `Input.tsx:10` documents "for multi-line, use `<Textarea>`". It exists in neither barrel; consumers hand-roll a `<textarea>`.                                                                                                                                            |
| `ProfileHeader`, native            | Web-only. Mobile builds the profile header inline on the screen.                                                                                                                                                                                                         |
| `Tab` counts, native               | Web's `Tab` takes `count` + `formatCount`; native's does not, because no mobile screen puts a badge on a tab. Adding an unused one to reach parity would be parity theatre — but mobile `/in/[handle]` still shows four tabs to web's five, and that part is a real gap. |
| `Checkbox` `indeterminate`, native | **Not a gap — settled 2026-07-29.** Web needs it for `/moderation`'s select-all; mobile ships no admin surface and no multi-select list, so native would carry a prop no screen can pass. Add it with the first native screen that selects many rows.                    |
| `RoomRow` prop shape               | Exists on both, but the shapes have not been diffed since either side last changed. Verify before treating as shared.                                                                                                                                                    |

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

## Shape decisions

| Decision            | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button radius       | **Settled 2026-07-27 at `md` (10px) on both.** The pill is the category default (LinkedIn, X) and `CLAUDE.md` says take the other option where a decision would converge. Web keeps what it had; native moved.                                                                                                                                                                                                                                                                  |
| Switch thumb colour | **Settled 2026-07-26.** One `switchThumb` token, light in both themes, with a border so it stays visible against the light OFF track. Web was hardcoded `bg-white`; native used `inkInverse`, near-black in dark — opposite colours.                                                                                                                                                                                                                                            |
| Number formatting   | **Settled 2026-07-26.** One convention: an injected `formatCount` prop. `AppShell`, `Tab` and both `OnboardingProgress` twins use it; the two copy-pasted Arabic-digit tables are gone.                                                                                                                                                                                                                                                                                         |
| Motion tokens       | **Settled 2026-07-26.** `nativeTokens.motion` carries durations and spring configs, referenced from the canonical source rather than copied.                                                                                                                                                                                                                                                                                                                                    |
| Avatar `blurhash`   | **Settled 2026-07-27.** `AvatarUser.avatarBlurhash` stays on both, because it is API data and both platforms accept the same user object. Only native _decodes_ it — expo-image does that for free and web has no decoder without a new dependency, which a 24–96px circle does not warrant. Web paints the initials chip underneath instead, so a slow or broken image degrades to initials rather than a grey hole. The dead `blurhash` **prop** on web's Avatar was deleted. |
| Post action labels  | **Settled 2026-07-27.** Re-measured at 390px in `ar-PS`: four labelled actions want 308px of 340px available and nothing clips, so both platforms show labels. Native's icon-only threshold moved from `> 3` to `> 4`. Five would still overflow.                                                                                                                                                                                                                               |
| Colour resolution   | **Settled 2026-07-26.** No colour in a module-scope `StyleSheet.create` on native — `lint:tokens` fails on it. Colours resolve at render from `useThemeTokens()`.                                                                                                                                                                                                                                                                                                               |
| Touch targets       | **Settled 2026-07-26.** `tokens.target` (`min: 44`, `compact: 40`). Web expands the pressable box with `.target-area` without changing layout; native derives `hitSlop` from the same token.                                                                                                                                                                                                                                                                                    |
| Boolean controls    | **Settled 2026-07-29.** `Checkbox` and `Switch` both take `checked` + `onChange(value: boolean)` on both platforms. `Switch` already did; web's `Checkbox` was the odd one out with `onCheckedChange`. Mobile's register consent field was a raw React Native `Switch` — the wrong control for consent, and outside the kit — and is the same `Checkbox` web ships now.                                                                                                         |

## Screen-level parity

Tracked in `docs/audit/OPUS5-ROUND3-2026-07-26.md`, which scores all 38 mobile
screens against their web twins. Two gaps found there are screen-level rather
than component-level:

- `profile-public` renders four tabs on mobile against web's five (no النشاط).
  Downstream of the native `Tab` count gap above.
- `network` and `me-connections` render the same screen on mobile; web treats
  them as two surfaces.
