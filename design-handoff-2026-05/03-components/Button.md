# Button

> Location in repo: `docs/components/Button.md`.
> Source: `packages/ui-web/src/Button.tsx` + `packages/ui-native/src/Button.tsx`.

## What it is

The primary interactive element. One API, two implementations.

## API

```ts
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "accent" | "danger-ghost";
  size?: "sm" | "md" | "lg";
  leading?: ReactNode; // icon
  trailing?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void; // mobile
  onClick?: () => void; // web
  children: ReactNode;
};
```

## Variants

| Variant        | Use                                                      | Visual                                   |
| -------------- | -------------------------------------------------------- | ---------------------------------------- |
| `primary`      | Main CTA, one per screen                                 | `brand-600` bg, white text               |
| `secondary`    | Neutral action                                           | White bg, `line-hard` border, `ink` text |
| `ghost`        | Tertiary, low visual weight                              | Transparent, `ink` text, subtle hover bg |
| `accent`       | Single rare emphasis (e.g. "Connect" on suggestion rows) | `accent-600` bg, white text              |
| `danger-ghost` | Destructive tertiary (e.g. "Remove")                     | Transparent, `danger` text               |

## Sizes

| Size | Height (web) | Padding | Font | Mobile hit area     |
| ---- | ------------ | ------- | ---- | ------------------- |
| `sm` | 28           | 6 × 10  | 13   | 44 (padded hitSlop) |
| `md` | 36           | 9 × 16  | 14   | 44                  |
| `lg` | 44           | 12 × 22 | 15   | 48                  |

## States

- **Default → Hover**: `bg` shifts to next darker tone (e.g. `brand-600` → `brand-700`). Transition `var(--dur-base) var(--ease-standard)`.
- **Active**: `translateY(1px)` on web; `opacity 0.85` on mobile.
- **Focus**: 2px outline `brand-500`, 2px offset, visible on keyboard only (`:focus-visible`).
- **Disabled**: `opacity 0.55`, cursor not-allowed, no hover.
- **Loading**: replace `leading` with spinner, keep label visible, disable pointer.

## RTL

Icons in `leading` / `trailing` should **not** mirror by default. A button with a send-arrow icon should add `rtl-mirror` class to that icon specifically.

## Accessibility

- Always has an accessible name. If icon-only, require `aria-label` (web) / `accessibilityLabel` (mobile).
- Minimum 44×44pt hit target on mobile even when visual is smaller (use `hitSlop`).
- Focus ring visible on keyboard, suppressed on mouse click.
- Loading state announces via `aria-busy="true"`.

## Examples

```tsx
<Button variant="primary">نشر</Button>
<Button variant="secondary" leading={<Icon name="plus" />}>إضافة</Button>
<Button variant="ghost" size="sm">إلغاء</Button>
<Button variant="accent" size="sm" loading>إرسال</Button>
```

## Anti-patterns

- ❌ Two primary buttons in the same view.
- ❌ Using primary for destructive actions — use `danger-ghost` or a confirmation dialog.
- ❌ Icon-only button without `aria-label`.
