# Surface

> Location: `docs/components/Surface.md`.
> Source: `packages/ui-web/src/Surface.tsx` + `packages/ui-native/src/Surface.tsx`.

## What it is

The wrapper for any bounded content area. Five variants to create intentional visual hierarchy. **Do not default to `card` everywhere** — that's what we're fixing.

## API

```ts
type SurfaceProps = {
  variant?: "flat" | "card" | "hero" | "tinted" | "row";
  padding?: keyof typeof tokens.space;
  children: ReactNode;
};
```

## Variants

| Variant  | Visual                                                                        | When to use                                     |
| -------- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| `flat`   | bg `surface`, `line-soft` border, radius `md`, no shadow                      | List containers, sidebar cards, nested sections |
| `card`   | bg `surface`, `line-soft` border, radius `lg`, `shadow-card`                  | Feed posts, main content blocks                 |
| `hero`   | bg `surface`, `line-soft` border, radius `xl`, `shadow-card`, overflow hidden | Profile header, mini-profile, splash            |
| `tinted` | bg `surface-subtle`, no border, radius `md`                                   | Inputs, own-message bubbles, quiet highlights   |
| `row`    | transparent bg, bottom border `line-soft`                                     | List items inside a flat container              |

## Rules

- The **top-level** surface on a page should usually be `card` or `hero`.
- Inside a `card`, nested sections should usually be `flat` or `row` — not another `card`. Nesting same variants kills hierarchy.
- Use `tinted` for inputs instead of bordered white — softer, reads as "here's where you type."
- Use `row` for every item in a scrolling list (messages, connections, search results).

## Anti-patterns

- ❌ `card` wrapping a `card` wrapping a `card` — flatten.
- ❌ `hero` for anything other than the single most prominent surface on a page.
- ❌ Adding a shadow to `flat` "to make it pop" — that's `card`.
- ❌ Mixing `card` and `flat` arbitrarily in a grid — pick one per list.

## Example composition (Feed page)

```
AppShell
├─ hero (mini-profile rail)
├─ flat (quick-links rail)
├─ card (composer)
├─ card (post)
├─ card (post)
└─ card (right rail — suggestions)
   └─ (plain child divs, no nested Surfaces)
```
