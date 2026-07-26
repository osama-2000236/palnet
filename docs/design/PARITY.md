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

| Component                                       | Lives on | Why                                                                                                                                               |
| ----------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tabs` / `Tab` / `TabPanel`                     | web      | Native uses `SegmentedControl`. **Not a rename** — see the capability gap below.                                                                  |
| `SegmentedControl`                              | native   | Same.                                                                                                                                             |
| `Dialog`                                        | web      | Native's equivalent is `Sheet`. A centred modal is not a mobile pattern; a bottom sheet is.                                                       |
| `Sheet`                                         | native   | Same. Genuinely drag-dismissable as of A4.9.                                                                                                      |
| `ReportDialog` / `ReportSheet`                  | split    | Same content, correct container per platform. Prop vocabulary matches.                                                                            |
| `AppHeader`                                     | native   | Web's chrome is `AppShell`'s sticky header. Mobile screens each own a header because there is no persistent top bar.                              |
| `SearchField`                                   | native   | Web search lives inside `AppShell`; mobile has no persistent shell to host it.                                                                    |
| `RecordCard` / `RecordCardSkeleton`             | native   | The mobile list idiom. Web uses `Surface variant="row"` inside a `flat` container — the composition PR #89 settled on.                            |
| `StateMessage`                                  | native   | Web splits the same job across `EmptyState` and `Alert`.                                                                                          |
| `ComposerEntry`                                 | native   | The collapsed composer. Web's `Composer` has a collapsed state built in; mobile needs a separate entry point because composing is a pushed route. |
| `ThemeProvider` / `useTheme` / `useThemeTokens` | native   | Web re-themes through CSS variables under `.dark`, so there is nothing for a provider to do.                                                      |
| `useReducedMotion`                              | native   | Web reads `prefers-reduced-motion` in CSS. Added 2026-07-26 (A4.4).                                                                               |
| `TypingIndicator`                               | web      | Mobile renders the same state inline in the thread.                                                                                               |
| `useStagger`                                    | web      | List entrance staggering. Native enforces `MOTION.md`'s single-entrance rule per screen instead.                                                  |
| `Alert`                                         | web      | Mobile uses `Banner` for transient notices and `StateMessage` for persistent ones. Previously recorded as "Partial"; it is a deliberate split.    |

## To be built — real gaps

| Gap                                | Detail                                                                                                                                                                                                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Textarea`, both platforms         | `Input.tsx:10` documents "for multi-line, use `<Textarea>`". It exists in neither barrel; consumers hand-roll a `<textarea>`.                                                                                                                                  |
| `ProfileHeader`, native            | Web-only. Mobile builds the profile header inline on the screen.                                                                                                                                                                                               |
| `SegmentedControl` counts          | `Tab` takes `count` + `formatCount`; `SegmentedControl` has no count or badge support at all. `Tabs ↔ SegmentedControl` is therefore a **capability** gap, not a naming one — and mobile `/in/[handle]` shows four tabs to web's five as a direct consequence. |
| `Checkbox` `indeterminate`, native | Web supports it and it is live on `/moderation`'s select-all. Native does not.                                                                                                                                                                                 |
| `RoomRow` prop shape               | Exists on both, but the shapes have not been diffed since either side last changed. Verify before treating as shared.                                                                                                                                          |

## Shipped in both barrels, mounted by nothing

Kept, because the fix is to wire them rather than delete them — but stated
plainly so nobody records them as parity. Adopted from #93's finding.

| Component            | Status                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OnboardingProgress` | Native: mounted by **no screen**. Mobile _has_ an onboarding flow and does not use it, so web shows step progress and mobile does not. A screen-parity gap, not an idle export. |
| `Checkbox`           | Native: renders on no screen at all.                                                                                                                                            |
| `Dialog`             | Native barrel exports it; nothing mounts it. `Sheet` is the real one.                                                                                                           |
| `Toast`              | Native: the provider is mounted, the component is not.                                                                                                                          |
| `Illustration` sets  | No mobile screen passes `direction`, so `OutlineSet` and `BlockSet` (~210 lines of `react-native-svg`) are unreachable on native.                                               |

## Prop drift

| Component  | Drift                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| `Checkbox` | Web `onCheckedChange`, native `onChange`. Unresolved — pick one and migrate. |

## Shape decisions

| Decision            | Resolution                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button radius       | **Open.** Web is `rounded-md` (10px), native is `radius.full` (pill) — the same button is a rounded rectangle on web and a pill on mobile. Left open deliberately: it is brand identity, not a defect, and belongs to a design owner. |
| Switch thumb colour | **Settled 2026-07-26.** One `switchThumb` token, light in both themes, with a border so it stays visible against the light OFF track. Web was hardcoded `bg-white`; native used `inkInverse`, near-black in dark — opposite colours.  |
| Number formatting   | **Settled 2026-07-26.** One convention: an injected `formatCount` prop. `AppShell`, `Tab` and both `OnboardingProgress` twins use it; the two copy-pasted Arabic-digit tables are gone.                                               |
| Motion tokens       | **Settled 2026-07-26.** `nativeTokens.motion` carries durations and spring configs, referenced from the canonical source rather than copied.                                                                                          |
| Colour resolution   | **Settled 2026-07-26.** No colour in a module-scope `StyleSheet.create` on native — `lint:tokens` fails on it. Colours resolve at render from `useThemeTokens()`.                                                                     |
| Touch targets       | **Settled 2026-07-26.** `tokens.target` (`min: 44`, `compact: 40`). Web expands the pressable box with `.target-area` without changing layout; native derives `hitSlop` from the same token.                                          |

## Screen-level parity

Tracked in `docs/audit/OPUS5-ROUND3-2026-07-26.md`, which scores all 38 mobile
screens against their web twins. Two gaps found there are screen-level rather
than component-level:

- `profile-public` renders four tabs on mobile against web's five (no النشاط).
  Downstream of the `SegmentedControl` capability gap above.
- `network` and `me-connections` render the same screen on mobile; web treats
  them as two surfaces.
