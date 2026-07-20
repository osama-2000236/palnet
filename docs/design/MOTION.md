# Motion — choreography contract

`DESIGN.md` remains the source of truth. This documents the shipped motion
tokens as a contract, closing Pass 2 open item 3
(`design-handoff-2026-05/08-problems.md`).

## Tokens of record

Defined once in `packages/ui-tokens/src/index.ts` (`tokens.motion`), mirrored
as CSS vars in `packages/ui-tokens/src/tokens.css` and as Tailwind theme keys
in `packages/ui-tokens/src/tailwind-preset.ts`. Never write a raw `ms`,
`cubic-bezier`, or translate distance in component code.

| Token               | Value                             | CSS var             | Use for                                              |
| ------------------- | --------------------------------- | ------------------- | ---------------------------------------------------- |
| `duration.fast`     | 80ms                              | `--dur-fast`        | Micro feedback: hover, press, focus ring             |
| `duration.base`     | 120ms                             | `--dur-base`        | State changes: toggles, chips, fades, color shifts   |
| `duration.slow`     | 240ms                             | `--dur-slow`        | Entrances, progress bars (`OnboardingProgress`)      |
| `easing.standard`   | `cubic-bezier(0.2, 0, 0, 1)`      | `--ease-standard`   | Default for every transition                         |
| `easing.emphasized` | `cubic-bezier(0.3, 0, 0, 1.15)`   | `--ease-emphasized` | Entrances and attention-drawing moves                |
| `easing.spring`     | `cubic-bezier(0.34, 1.4, 0.5, 1)` | `--ease-spring`     | Entrance overshoot; sparingly, one element at a time |
| `stagger.step`      | 40ms                              | `--stagger-step`    | Per-item list entrance delay                         |
| `stagger.max`       | 6 items                           | —                   | Delay cap: item 6+ appears immediately               |
| `enter.rise`        | 8px (= `space[2]`)                | `--enter-rise`      | Entrance translateY distance                         |

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
