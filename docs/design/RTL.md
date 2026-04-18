# RTL.md — RTL rules for Baydar

> Location: `docs/design/RTL.md`.
> These rules are non-negotiable. Violations are bugs.

## Core principle

**Arabic is not English mirrored.** We design in RTL first. Every layout decision starts from "where does the eye land in Arabic?" — not "flip the English."

## CSS rules

### Never use physical properties

| ❌ Do not use | ✅ Use instead |
|---|---|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left: 0` | `inset-inline-start: 0` |
| `right: 0` | `inset-inline-end: 0` |
| `border-left` | `border-inline-start` |
| `text-align: left` | `text-align: start` |
| `float: left` | (don't float; use flex/grid) |

Tailwind: use `ms-*` / `me-*` / `ps-*` / `pe-*` / `start-*` / `end-*` / `text-start`. Never `ml-*` / `mr-*` / `pl-*` / `pr-*` / `left-*` / `right-*` / `text-left`.

### Transforms

- `translateX(10px)` moves content rightward regardless of direction. If you want "push toward the end", compute direction or use logical inset properties.
- Rotations are direction-agnostic.

### Shadows and gradients

- Shadows usually don't need flipping (light source doesn't care about reading direction).
- Linear gradients with a direction: use `to inline-end` / `to inline-start` when the direction is semantic (e.g. progress bar fill).

## Icon flipping

Most icons are **not mirrored in RTL**. Some are. The rule:

**Flip if directional** — motion, navigation, sending, progress.
**Don't flip if iconic** — objects, people, abstract symbols.

| Category | Flip? | Examples |
|---|---|---|
| Arrows, chevrons | ✅ yes | back, next, forward, reply, undo |
| Send (paper plane) | ✅ yes | message send, post submit |
| Navigation carets | ✅ yes | breadcrumb separator, dropdown arrow |
| Email, phone, padlock | ❌ no | inbox, call, lock |
| Magnifying glass | ❌ no | search (logo-like) |
| Camera, image, video | ❌ no | attach |
| Clocks, calendars | ❌ no | time, date |
| Numbers | ❌ no (see below) | any |
| Thumb, heart | ❌ no | reactions |
| Logo | ❌ no | always |

Implementation: add `rtl-mirror` class (see `tokens.css`) to directional icons. Default: no mirroring.

## Numerals

**Always LTR, even inside Arabic text.** `١٢٣ مشاركة` and `123 مشاركة` both render left-to-right for the number itself.

```jsx
<span>شارك <span dir="ltr" className="mono">{count}</span> شخصاً</span>
```

For anything typeset with a lot of numbers (stats, timestamps, phone, code):
- Use `font-variant-numeric: tabular-nums` (`.mono` class).
- Wrap in `dir="ltr"` or `unicode-bidi: isolate`.

## Mixed-language strings

When a string contains both Arabic and Latin (code, product names, URLs):

```css
.mixed { unicode-bidi: plaintext; } /* or isolate */
```

Examples:
- `سأجرّب Next.js هذا الأسبوع` — leave inline, Latin renders LTR inside Arabic naturally.
- Code blocks — explicit `dir="ltr"` on `<pre>` / `<code>`.
- URLs / emails / handles — explicit `dir="ltr"`.

## Input direction

- Arabic-expected inputs (name, body, message): `dir="rtl"` (inherited).
- Language-agnostic inputs (email, password, handle, URL, phone): `dir="ltr"` even on an RTL page.
- Mixed-content inputs (caption, bio): `dir="auto"` so the paragraph direction follows the first strong character.

## Text truncation

`text-overflow: ellipsis` works the same, but the ellipsis appears on the **end** side (left in RTL) — which is correct. No action needed except avoiding fixed widths that guarantee truncation.

## Layouts

- `flex` + `gap` is RTL-safe. Children reorder automatically.
- `order:` values are numeric — they flip naturally.
- `justify-content: flex-start` = start side (right in RTL). `flex-end` = end side. No changes needed.
- `position: absolute; right: 0` ❌ → `position: absolute; inset-inline-end: 0` ✅.

## Tables

- `dir="rtl"` on `<table>` flips column order. For data with inherent direction (timestamps, currency), override per-cell.

## Testing

- **Visual test**: every new component screenshot in RTL first, LTR second.
- **Swap-direction test**: toggle `<html dir="ltr">` in devtools; component should still work (layouts shouldn't break, even if copy is Arabic).
- **Mixed-content test**: paste a string with Arabic + Latin + numerals + emoji; verify each runs in its natural direction.

## Checklist for every new component

- [ ] No `left`/`right`/`margin-l`/`margin-r` anywhere.
- [ ] Icons audited: directional ones have `rtl-mirror`, others don't.
- [ ] Numerals wrapped with `dir="ltr"` if inline in Arabic text.
- [ ] Tested with `<html dir="rtl">` (default) AND `<html dir="ltr">`.
- [ ] Language-agnostic inputs use explicit `dir="ltr"`.
