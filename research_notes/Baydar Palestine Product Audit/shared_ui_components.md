# Shared UI and design-system audit

**Date:** 2026-11-13  
**Scope:** `packages/ui-web/src`, `packages/ui-native/src`, `packages/ui-tokens`, and the shared Tailwind config.  
**Method:** source inspection and local build/test commands only. No product files were changed and no git mutations were performed.

## Coverage manifest

| Area | Files reviewed | Result |
|---|---:|---|
| Web primitives and composed components | 30 source/test files | Reviewed `Alert`, `AppShell`, `Avatar`, `Banner`, `Button`, `Checkbox`, `Chip`, `Composer`, `Dialog`, `EmptyState`, `Icon`, `Illustration`, `Input`, `Menu`, `MessageBubble`, `OnboardingProgress`, `Popover`, `PostCard`, skeletons, `RadioGroup`, `RetryChip`, `RoomRow`, safety components, `SearchResultSkeleton`, `Skeleton`, `Surface`, `Switch`, `Table`, `Tabs`, `Toast`, and `Tooltip`. |
| Native primitives and composed components | 33 source/test files | Reviewed the corresponding native components, including `AppHeader`, `AppShell`, `ComposerEntry`, `RecordCard`, `SearchField`, `SegmentedControl`, `Sheet`, and `StateMessage`. |
| Tokens and presets | 6 files | Reviewed token sources, generated CSS/native outputs, Tailwind presets, and package configuration. |
| Verification | 4 commands | See **Checks run** below. Tests passing does not establish visual or device correctness. |

## Findings

### P1 — `IconName` includes `building`, but the web icon renderer has no matching case

`packages/ui-web/src/Icon.tsx:23` accepts `"building"`; the only building-like renderer is `case "employer"` at `Icon.tsx:247`, and the default at `Icon.tsx:285-286` returns `null`. The web shell uses `icon: "building"` for the employer route at `packages/ui-web/src/AppShell.tsx:125`. Consequently the employer navigation control can render without its intended icon. The native icon union does not contain `building`, so this is also a cross-platform contract mismatch.

**Recommendation:** either add a `building` case or change the shell to the implemented `employer` name, then align both icon unions and add a test for every shell icon.

### P1 — `error` is advertised as an illustration motif but every renderer rejects it

`packages/ui-web/src/Illustration.tsx:23` includes `"error"` in `ILLUSTRATION_MOTIFS`, but `OutlineSet` (`Illustration.tsx:94-176`), `BlockSet` (`Illustration.tsx:184-268`), and `HarvestSet` (`Illustration.tsx:293-389`) have no `error` case and fall through to `null`. `EmptyState` selects this motif for `kind="error"` at `EmptyState.tsx:23`, and the public app renders `Illustration motif="error"` in `apps/web/src/app/[locale]/error.tsx:31`, `apps/web/src/app/[locale]/not-found.tsx:79`, and `apps/web/src/app/[locale]/(app)/error.tsx:40`. These error surfaces can therefore render an empty illustration instead of the documented error treatment. Native omits `error` from its motif union at `packages/ui-native/src/Illustration.tsx:10-20`, so the two kits disagree as well.

**Recommendation:** implement the motif in all three directions on both platforms, or remove it from the public union and provide an explicit error fallback. Add a render test for every exported motif and every `EmptyState` kind.

### P1 — the native message bubble’s accessible label excludes the message content

`packages/ui-native/src/MessageBubble.tsx:86-95` sets `accessibilityLabel={srPrefix}` on the bubble wrapper. The children, including the message text and status text, are rendered below that wrapper, but are not included in the label. A screen reader can receive only the sender/time prefix rather than the actual message. This is a direct accessibility defect, not a visual-rendering claim.

**Recommendation:** compose the accessible label from the prefix, message content, and delivery state; preserve any separate retry action label and add a TalkBack-oriented accessibility test.

### P1 — the native shell presents nonfunctional search and profile controls

`packages/ui-native/src/AppShell.tsx:100-105` renders a search icon and an empty `View`; it does not render a `TextInput` or invoke a search callback. `AppShell.tsx:148-154` renders a profile `TouchableOpacity` whose `onPress` is an empty TODO. Both controls appear interactive but cannot perform their advertised actions. The native props also omit the web shell’s `onViewProfile`, `onOpenSettings`, and `onSignOut` callbacks, which are defined at `packages/ui-web/src/AppShell.tsx:100-108`.

**Recommendation:** hide these controls until wired, or add the required input/callback props and implement navigation. Do not treat the native shell as feature parity while these paths remain inert.

### P1 — native `PostCard` renders an inert overflow control and does not share the web action contract

The native card renders only an icon in `packages/ui-native/src/PostCard.tsx:73-75`; there is no `Pressable`, callback, or accessible action for overflow. Its props expose `onAuthorPress`, a generic `actions` array, and flat count fields (`PostCard.tsx:20-36`), whereas web exposes `onOpenProfile`, `onToggleReaction`, `onRepost`, `onShare`, `onReport`, `labels`, `counts`, and `commentsSlot` (`packages/ui-web/src/PostCard.tsx:61-92`). This is both an interaction gap and a significant API parity mismatch.

**Recommendation:** either remove the overflow glyph or make it a labelled, wired action. Align the shared action/label vocabulary and add tests for overflow, comments, reaction, repost, share, and report behavior.

### P2 — keyboard focus is not consistently tokenized or visibly styled

The design contract requires a 2px `--brand-600` focus outline (`DESIGN.md:249-254`), but the canonical ring is `0 0 0 2px var(--brand-500)` in `packages/ui-tokens/src/index.ts:115-117` and `packages/ui-tokens/src/tokens.css:82-84`. Several web controls use a different `focus:outline-none`/ring treatment rather than the shared ring, including `AppShell.tsx:282,301,340,388,436,495`, `Composer.tsx:144,257,265`, `Menu.tsx:114`, and `PostCard.tsx:134,142,161`. Web `RadioGroup` hides the native input with `sr-only` at `packages/ui-web/src/RadioGroup.tsx:58-67`, but its label has no `:focus-within` or `peer-focus-visible` styling (`RadioGroup.tsx:48-56`), so keyboard focus can be visually invisible.

**Recommendation:** make the token match the contract and apply one shared focus-visible recipe, including a visible focus-within state for radio pills. Add keyboard tests that assert the actual focused element and focus styling hook, not merely callback invocation.

### P2 — physical RTL styles remain in native components

The RTL contract requires logical start/end styling (`DESIGN.md:53-55`; `docs/design/RTL.md:12-26`). Native still uses physical margins in `packages/ui-native/src/AppShell.tsx:193,208,227,249,254`, `ProfileSkeleton.tsx:45,136,160,185,209,241`, `RoomListSkeleton.tsx:41,47`, and `SearchResultSkeleton.tsx:41,47`. `Sheet` uses physical `left`/`right` positioning at `packages/ui-native/src/Sheet.tsx:139-142`. These values can place content on the wrong side under RTL or make a future LTR/RTL adaptation unreliable.

**Recommendation:** replace directional margins/positions with start/end-aware layout or explicit RTL-safe transforms; add RTL and LTR native snapshot/layout tests.

### P2 — text direction is hardcoded in several native components

`textAlign: "right"` is hardcoded in `AppHeader.tsx:86,94`, `PostCard.tsx:180,187,194,211`, `RecordCard.tsx:126,133,141`, and `ComposerEntry.tsx:69`; `RecordCard.tsx:145` also uses `textAlign: "left"`. This contradicts the start/end requirement and can misalign Arabic or mixed-language content when direction changes. `EmptyState.tsx:78,90` similarly maps `align="start"` to physical `left`.

**Recommendation:** use logical text alignment and direction-aware mixed-content handling; test Arabic, English, numerals, and mixed strings in both directions.

### P2 — the two Tailwind presets have drifted and both are live

`packages/config/tailwind-preset.js:1-90` duplicates token values manually. `packages/ui-tokens/tailwind-preset.ts:11-88` derives values from `tokens`, but differs in font fallbacks, available shadows (`nav`/`modal`), and spacing coverage. The web app consumes `@baydar/config/tailwind-preset` (`apps/web/tailwind.config.ts:3`), while the package documentation presents the token preset as the drop-in preset. This creates two competing sources of truth and makes token changes dependent on manual synchronization.

**Recommendation:** make the config preset re-export the canonical token preset, or remove the unused preset only after checking all consumers. Add a preset parity test covering colors, typography, spacing, radii, and shadows.

### P2 — combined `Chip` actions create nested buttons and competing keyboard handlers

The web chip documents simultaneous whole-chip and removal actions at `packages/ui-web/src/Chip.tsx:8-15`. When both are supplied, the outer control is a `<button>` at `Chip.tsx:145-162` and the removal control is another `<button>` at `Chip.tsx:109-137`. Nested buttons are invalid interactive markup; Enter/Space on the inner control can also be handled by the outer `onKeyDown` at `Chip.tsx:153-157`, producing conflicting behavior.

**Recommendation:** use a non-button wrapper with two sibling controls when both actions exist, and define one keyboard owner per action. Add a test for click, Enter, Space, and remove propagation with both callbacks present.

### P2 — `Menu` has unstable effect dependencies and does not restore trigger focus

`packages/ui-web/src/Menu.tsx:49-51` creates a new `selectable` array on every render, while the effect at `Menu.tsx:53-65` depends on that array. Any open-state render can therefore reset active navigation to the first item. Escape closes at `Menu.tsx:79-83`, but no trigger ref or focus restoration is implemented; outside pointer close at `Menu.tsx:58-62` has the same issue. Existing tests verify close behavior (`packages/ui-web/src/__tests__/atoms.test.js:315-337`) but not focus return or rerender stability.

**Recommendation:** memoize the selectable list, preserve the active item across renders, and restore focus to the trigger for every close path. Add rerender, Escape, outside-click, and keyboard-focus assertions.

### P3 — native `Chip.selected` is not exposed through the package barrel

`packages/ui-native/src/Chip.tsx:31` defines `selected?: boolean`, and the native test uses it at `packages/ui-native/src/__tests__/Chip.test.tsx:9`. However `packages/ui-native/src/index.ts:25-26` exports `ChipProps` and `ChipSize` only; the web barrel exports `ChipVariant` at `packages/ui-web/src/index.ts:72-73`, while native does not. Consumers cannot consistently discover the preferred selected-state API or variant vocabulary from the public barrel.

**Recommendation:** export the intended selected/variant types and align the web alias/migration story with `docs/design/PARITY.md:5-23`. Add a public-type/API surface test.

### P3 — multiple shared components exceed the repository’s 300-line maintenance limit

`AGENTS.md:10-11` sets a 300 LOC limit per page/component. Current oversized shared files include `packages/ui-web/src/AppShell.tsx` (467), `Composer.tsx` (309), and `Illustration.tsx` (382), plus `packages/ui-native/src/Illustration.tsx` (411). These files combine rendering, navigation/state, and large glyph definitions, increasing the chance of the contract drift observed above.

**Recommendation:** split glyph data from component behavior and separate shell/composer subcomponents without changing public APIs. Keep the size check in CI so new violations fail review.

## Verification and limits

### Checks run

- `pnpm --filter @baydar/web test`: **6 suites / 24 tests passed**.
- `pnpm --filter @baydar/ui-web test`: **3 suites / 26 tests passed**.
- `pnpm --filter @baydar/ui-native build`: **passed** (`tsc -p tsconfig.json --noEmit`).
- `pnpm --filter @baydar/mobile exec jest --runInBand`: **33 suites / 89 tests, 5 snapshots passed**. The run emitted React `act(...)` warnings from `apps/mobile/app/(app)/settings/notifications.tsx`; these warnings are outside this audit’s component scope.

### What was not verified

No browser, screen reader, physical-device, RTL visual, TalkBack, or accessibility-tree audit was performed. The findings above are source-confirmed implementation defects or contract mismatches; visual severity and actual assistive-technology pronunciation still require runtime verification. No deletion is recommended: the affected components are publicly exported design-system APIs, and unused-looking unions or inert controls need a compatibility decision rather than blind removal.
