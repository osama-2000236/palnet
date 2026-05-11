# Empty-state illustration direction — Baydar Pass 1

## Style stance

**Geometric line-art, agrarian motif, two-tone.**

Pulled from Baydar's threshing-floor metaphor (`BRAND.md` §3). Every illustration is one or two simple geometric shapes — a sheaf, a winnow, a door arch, an empty bowl, a lantern — drawn as thin strokes on a neutral surface, with one warm accent fill.

This direction is the deliberate opposite of:

- LinkedIn's 3D isometric people illustrations.
- Generic SaaS "magnifying glass over empty box."
- Photographic empty states.
- Decorative blobs / orbs / mesh gradients.

It is also the deliberate opposite of *complex hand-drawn SVG*, which `DESIGN.md` §13 forbids.

## The recipe

Each illustration is:

- **128 × 128** intrinsic viewBox (the default `illustration.size.md`). Component-scaled at render time via `illustration.size.{sm|md|lg}`.
- **2 px stroke** (`stroke-width="2"`), `stroke-linecap="round"`, `stroke-linejoin="round"`.
- **`currentColor` stroke**, inherited from the surrounding text color. The component wraps each SVG in a `text-brand-700` (web) / `nativeTokens.color.brand700` (native) container.
- **One fill region** only, using `--brand-50` (web) / `nativeTokens.color.brand50` (native). Warm tint, never saturated.
- **No gradients. No drop shadows. No textures.** The single allowed decorative gradient in the system is the profile cover (`DESIGN.md` §13).
- **No human figures.** Avoids representation bias in a regional product.
- **RTL-safe.** Compositions are vertically symmetric where possible. Where directional (e.g. a door opening), the illustration is mirrored at runtime under `[dir="rtl"]` via `rtl-mirror` from `tokens.css`.

## The eight illustrations

| Slug | Used by | Motif | Notes |
| --- | --- | --- | --- |
| `wheat-sheaf` | feed | Two stylised wheat stalks tied at the base | Threshing metaphor. Vertical, symmetric. |
| `door-arch` | network | An open Levantine arch | Two-tone — arch outline, threshold tint. Mirrored under RTL. |
| `envelope-folded` | messages | A simple folded envelope, flap open | Symmetric. |
| `lantern` | notifications | A hanging lantern with three soft rays | Soft, not aggressive. |
| `winnowing-tray` | search | An empty winnowing basket from above | Two concentric circles + interior weave hint. |
| `briefcase-tied` | jobs | A flat briefcase with a single tie cord | Restrained — not a corporate suitcase. |
| `field-rows` | profile (own) | Three plowed rows receding | Used as the "your profile is empty" cue. Vertical, symmetric. |
| `low-wall` | settings/blocked | A short stone wall with one gap | Quiet, not threatening. |

## Tokens added

```ts
illustration: {
  size: { sm: 96, md: 128, lg: 160 },
  stroke: 2,
}
```

No new color tokens — illustrations reuse `brand-700` (stroke via currentColor) and `brand-50` (fill).

## Acceptance rules

- All illustrations are pure SVG, ≤ 30 lines each, ≤ 1 KB gzipped.
- No raw hex literals (use `currentColor` for stroke; fill resolves through Tailwind or nativeTokens).
- All shapes draw from straight lines, circles, and quadratic curves — no Bézier sculpting.
- Each illustration ships a web (`.tsx` returning `<svg>`) and native (`.tsx` returning `react-native-svg`) twin in the same commit.
- The component slot is `illustration: ReactNode` — illustrations are passed in, never selected by a string enum. Lets feature owners drop in a one-off without bloating a registry.
