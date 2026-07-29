# Building with Baydar (بيدر)

Baydar is an **Arabic-first professional network**. Every design you build with this
library is RTL by default, uses the olive `brand-*` ramp, and takes its colors,
spacing, radii and type from tokens — never from raw hex or px.

## Setup

There is **no provider to wrap** — components are self-contained and read their
theme from CSS custom properties. Two things must be true for a design to look
right:

1. `styles.css` is loaded. It `@import`s the tokens, the `@font-face` rules, and
   the compiled component CSS. Without it every component renders as unstyled
   HTML.
2. The root direction is RTL. `styles.css` already sets `html { direction: rtl }`
   — leave it. For a Latin-only subtree, set `dir="ltr"` on that subtree only.

```jsx
<Surface variant="card" padding="4" className="max-w-md">
  <h2 className="text-h3 text-ink font-semibold">خلاصتك</h2>
  <p className="text-small text-ink-muted mt-1">ابدأ منشورًا لتظهر تحديثاتك هنا.</p>
  <div className="mt-3 flex gap-2">
    <Button variant="primary">انشر</Button>
    <Button variant="ghost">إلغاء</Button>
  </div>
</Surface>
```

**Only named scale utilities resolve.** The stylesheet you get is pre-compiled —
there is no build step that scans your markup — so arbitrary-value classes like
`max-w-[560px]`, `text-[15px]` or `p-[13px]` will silently do nothing. Use the
named steps in the table below, and inline `style={{ … }}` for genuine one-offs
(a fixed pixel width, an aspect ratio).

## Styling idiom: Tailwind utilities over a token preset

Components take a `className` and are styled with Tailwind utilities whose scales
come from `@baydar/ui-tokens`. Use these families for your own layout glue —
do not invent color or spacing names, and never write a hex.

| Family    | Utilities                                                                    | Values                                                                    |
| --------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Brand     | `bg-brand-600`, `text-brand-700`, `border-brand-600`                         | `brand-50` … `brand-900` (olive)                                          |
| Accent    | `bg-accent-600`, `text-accent-700`                                           | `accent-50`, `100`, `500`, `600`, `700` (terracotta — rare emphasis only) |
| Text      | `text-ink`, `text-ink-muted`, `text-ink-subtle`, `text-ink-inverse`          | —                                                                         |
| Surfaces  | `bg-surface`, `bg-surface-muted`, `bg-surface-subtle`, `bg-surface-sunken`   | —                                                                         |
| Lines     | `border-line-soft`, `border-line-hard`                                       | —                                                                         |
| Semantic  | `text-danger`, `bg-success/10`, `text-warning`, `text-info`                  | `success` `warning` `danger` `info`                                       |
| Spacing   | `p-4`, `gap-3`, `mt-2`                                                       | `0`–`24`, 4px per step                                                    |
| Radius    | `rounded-xs sm md lg xl`                                                     | 4 / 6 / 10 / 14 / 20 px                                                   |
| Shadow    | `shadow-card`, `shadow-pop`, `shadow-nav`, `shadow-modal`                    | —                                                                         |
| Type size | `text-display h1 h2 h3 body small caption`                                   | 36 / 26 / 19 / 16 / 15 / 13 / 12 px                                       |
| Font      | `font-sans` (Plex Sans Arabic), `font-body` (Noto Naskh Arabic), `font-mono` | —                                                                         |
| Motion    | `duration-fast base slow`, `ease-standard emphasized spring`                 | —                                                                         |

**No Tailwind blue.** If you reach for `blue-500`, you want `brand-600`.

## RTL is not optional

Never use `left` / `right` / `ml-*` / `pr-*`. Use logical utilities only:
`ms-*` / `me-*`, `ps-*` / `pe-*`, `start-*` / `end-*`, `border-s` / `border-e`,
`text-start` / `text-end`. Numeric runs that contain a separator (`0 / 3000`,
`12:30–14:00`) must be wrapped in `<span dir="ltr">` or the bidi algorithm
reverses them. See `guidelines/RTL.md`.

## Surfaces: pick one of five, deliberately

Do not wrap everything in the same bordered card. `Surface` has five variants and
they mean different things: `flat` (secondary section), `card` (a standalone unit
— a post, a job, a person), `hero` (page header, clipped content), `tinted`
(hint/summary, no border), `row` (a list row, bottom divider only). Nest them —
`row` items inside a `card` is the settings-list pattern.

## Content rules

- **Arabic first.** Write Arabic copy; English is the fallback. Components take
  their strings via a `labels` prop and ship no hardcoded text — always pass it.
- **Avatars wherever a person appears.** `<Avatar user={…} />` derives initials
  and a deterministic palette; there is no "no avatar" state.
- **One accent CTA per screen**, one `variant="primary"` per screen.
- Interactive elements need a label, a visible focus ring, and a 40px hit target.

## Where the truth lives

- `styles.css` and its imports (`tokens/tokens.css`, `fonts/fonts.css`,
  `_ds_bundle.css`) — the real values.
- `components/<group>/<Name>/<Name>.d.ts` — the prop contract.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage and examples.
- `guidelines/` — `DESIGN.md`, `BRAND.md`, `RTL.md`, `MOTION.md`, `NAV.md`,
  `SCREENS.md`. Read `RTL.md` and `DESIGN.md` before laying out a screen.
