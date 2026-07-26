# Motion — choreography contract

`DESIGN.md` remains the source of truth. This documents the shipped motion
tokens as a contract, closing Pass 2 open item 3
(`design-handoff-2026-05/08-problems.md`).

## Tokens of record

Defined once in `packages/ui-tokens/src/index.ts` (`tokens.motion`), mirrored
as CSS vars in `packages/ui-tokens/src/tokens.css` and as Tailwind theme keys
in `packages/ui-tokens/src/tailwind-preset.ts`. Never write a raw `ms`,
`cubic-bezier`, or translate distance in component code.

| Token               | Value                             | CSS var             | Use for                                                        |
| ------------------- | --------------------------------- | ------------------- | -------------------------------------------------------------- |
| `duration.fast`     | 80ms                              | `--dur-fast`        | Micro feedback: hover, press, focus ring                       |
| `duration.base`     | 120ms                             | `--dur-base`        | State changes: toggles, chips, fades, color shifts             |
| `duration.slow`     | 240ms                             | `--dur-slow`        | Entrances, progress bars (`OnboardingProgress`)                |
| `duration.slower`   | 400ms                             | `--dur-slower`      | Sheet and dialog entrances — a surface travelling from an edge |
| `easing.standard`   | `cubic-bezier(0.2, 0, 0, 1)`      | `--ease-standard`   | Default for every transition                                   |
| `easing.emphasized` | `cubic-bezier(0.3, 0, 0, 1.15)`   | `--ease-emphasized` | Entrances and attention-drawing moves                          |
| `easing.spring`     | `cubic-bezier(0.34, 1.4, 0.5, 1)` | `--ease-spring`     | Entrance overshoot; sparingly, one element at a time           |
| `stagger.step`      | 40ms                              | `--stagger-step`    | Per-item list entrance delay                                   |
| `stagger.max`       | 6 items                           | —                   | Delay cap: item 6+ appears immediately                         |
| `enter.rise`        | 8px (= `space[2]`)                | `--enter-rise`      | Entrance translateY distance                                   |

## The one entrance

`animate-enter-up` (Tailwind preset keyframe `enter-up`): fade from 0 + rise
8px, `--dur-slow` × `--ease-emphasized`, fill `both`. This is the only
entrance animation. Lists stagger it via `staggerDelay(index)` from
`@baydar/ui-web` — 0, 40, 80… ms, capped at 6 items so a long list finishes
inside one `--dur-slow` (6 × 40 = 240ms). Shipped consumers: feed, search
results, network.

## Rules

- **One entrance per screen load.** Content entering the viewport rises once;
  nothing re-animates on scroll, tab return, or refetch.
- **Vertical only.** Entrances translate on Y. Never translateX — horizontal
  motion needs RTL mirroring and buys nothing. This keeps every animation
  RTL-safe by construction.
- **Animate opacity and transform only.** No width/height/top/inset
  animation except the `OnboardingProgress` bar width (deliberate, tokenized
  at `--dur-slow`).
- **No decorative motion.** No parallax, no looping ornaments, no attention
  bounces. The only loops are status loops: skeleton pulse while loading and
  the `TypingIndicator` dots.
- **Reduced motion is honored.** `apps/web/src/app/globals.css` renders
  entrances at their final state under `prefers-reduced-motion: reduce`. Any
  new animation class must be added to that block.

## Native

`nativeTokens` carries no motion section today — the only native animation
is the `packages/ui-native/src/Skeleton.tsx` opacity pulse (600ms/loop,
hardcoded). Before adding any native entrance or transition, port
`tokens.motion` values into `nativeTokens` first, then consume — same
lockstep rule as every other token.

## Usage audit (2026-07-19)

Sweep of `packages/ui-web`, `packages/ui-native`, and `apps/web` for raw
durations, easings, and delays vs. this contract:

- **Fixed in this pass:** `Button`, `Input`, `Switch` used Tailwind
  `duration-150 ease-out` (150ms is not a token value). Now
  `duration-base ease-standard` via the preset keys.
- **Conforming:** `OnboardingProgress` (`--dur-slow` / `ease-standard`),
  feed/search/network list entrances (`staggerDelay` + `animate-enter-up`),
  reduced-motion block in `globals.css`.
- **Documented exceptions:** `TypingIndicator` dot delays (150/300ms — loop
  phase offsets, not entrance timing); native `Skeleton` 600ms pulse (no
  `nativeTokens.motion` yet, see §Native). `setTimeout` debounces in app
  code (messages refetch 150ms, jobs filter 250ms) are data timing, not
  motion, and stay out of scope.

---

## The four bands (revised 2026-07-26, design-system v2)

The contract above was written as a near-total ban: "no decorative motion", "one
entrance per screen load", "vertical only", and it recorded that native carried
no motion tokens at all. That restraint is right for **decoration** and wrong
for **feedback** — it is why the mobile app had no transitions of any kind and
why a native toggle's thumb teleported while its web twin animated.

Motion now falls into four bands. The first two are required; the third is
capped; the fourth stays banned.

### 1. Feedback — required

Press, toggle, selection, validation, reaction. Confirms an input was received.

- Budget: ≤ `--dur-base`.
- Always tokenized, always reduced-motion guarded.
- Examples: `.state-layer` hover/press overlay, the Switch thumb spring, the
  `.react-press` scale.

### 2. Transition — required

Sheet, dialog, tab indicator, navigation. Explains where a surface came from.

- Budget: `--dur-slow`, or `--dur-slower` for a surface entering from an edge.
- Spring where the surface is **directly manipulated** — a dragged sheet must
  resolve from its current velocity, which a duration curve cannot do.

### 3. Entrance — capped

Unchanged: one entrance per screen load, `animate-enter-up`, staggered at
`--stagger-step` with the 6-item cap.

### 4. Decorative — banned

Unchanged. No parallax, no looping ornaments, no confetti, no attention
bounces. Loops are status-only (skeleton pulse, typing dots).

## Direction, and the mirrored exceptions

"Vertical only" remains the default, because a vertical move means the same
thing in both writing directions. Three exceptions are allowed, and each one
must mirror:

| Exception     | Rule                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Switch thumb  | Travels along the writing direction. Native flips the sign on `I18nManager.isRTL`; web uses `start-*`. |
| Tab indicator | Follows the tab strip, which is already laid out in reading order.                                     |
| Sheet drag    | Vertical, so no mirroring needed — listed here because it is the one gesture-driven motion.            |

The toast enters vertically **on purpose**: the stack is anchored with
`inset-inline-end`, so a horizontal entrance would mirror and a vertical one
does not have to.

## Reduced motion

Every animation has a fallback on both platforms, and this is a hard gate:

- **Web** — the class goes in the `prefers-reduced-motion: reduce` block in
  `apps/web/src/app/globals.css`. Transitions are disabled there too, not only
  keyframes: a 0.92 press scale is exactly the movement the setting is asking
  us to stop.
- **Native** — `useReducedMotion()` from `@baydar/ui-native`, built on core
  RN's `AccessibilityInfo` (no Expo API — the kit is framework-neutral). It
  starts `false` and corrects on the first async read, deliberately: starting
  `true` would animate _into_ motion a moment later, which is the one outcome
  the setting exists to prevent.

## Native spring configs

`nativeTokens.motion.spring`, referenced from the canonical source rather than
copied. Physics rather than curves, because a spring interrupted mid-flight
resolves from its current velocity.

| Config   | stiffness / damping / mass | Use for                   |
| -------- | -------------------------- | ------------------------- |
| `toggle` | 420 / 32 / 0.9             | Switch thumb              |
| `sheet`  | 260 / 30 / 1               | Sheet settle after a drag |
| `press`  | 520 / 28 / 0.7             | Press-in release          |

## Haptics

Haptics live in `apps/mobile`, not in `packages/ui-native`. `expo-haptics` is
an Expo API and `CLAUDE.md` forbids those inside the shared kit — the same rule
that makes `formatCount` an injected prop rather than an import. A control that
wants haptics fires them from its `onChange` handler in the app layer.
