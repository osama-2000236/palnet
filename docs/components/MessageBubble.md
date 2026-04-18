# MessageBubble

> Location: `docs/components/MessageBubble.md`.
> Source: `packages/ui-web/src/MessageBubble.tsx` + `packages/ui-native/src/MessageBubble.tsx`.

## What it is

A single message in a thread. Differentiates own vs. other by subtle fill + tail direction — not by saturation.

## API

```ts
type MessageBubbleProps = {
  message: Message;
  mine: boolean;
  showTail?: boolean; // only on last of a run
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
};
```

## Visual

| | Mine | Theirs |
|---|---|---|
| Background | `brand-100` (#e6ebd6) | `surface` (#ffffff) |
| Border | 1px `brand-200` | 1px `line-soft` |
| Text color | `ink` | `ink` |
| Alignment | `flex-end` | `flex-start` |
| Tail | End-bottom corner `radius-xs` (4px) | Start-bottom corner `radius-xs` |
| Max width | 70% of container | 70% |
| Padding | 10 × 14 | 10 × 14 |
| Radius | `lg` default, tail corner `xs` | same |

**Critical decision, documented:** we do **NOT** fill own messages with `brand-600` (the CTA color). A chat thread filled with CTA-colored bubbles reads as a wall of buttons. `brand-100` keeps the thread calm and preserves CTA recognition.

## Grouping

Consecutive messages from the same author within 2 minutes = a "run":
- Only the **last** bubble in a run shows the tail corner.
- Middle bubbles have uniform `lg` corners.
- 2px spacing within a run, 12px between runs.

## Timestamp + status

- Timestamp: `caption`, end-aligned for mine / start-aligned for theirs, 3px below the bubble.
- Status ticks (mine only, at end of timestamp):
  - `sending` — a single hollow tick or clock glyph.
  - `sent` — single filled tick.
  - `delivered` — double tick.
  - `read` — double tick colored `brand-600`.
  - `failed` — `x` in `danger` + "فشل الإرسال، اضغط لإعادة المحاولة" on tap.

## RTL

Everything uses `flex-end` / `flex-start` + `insetInlineStart` / `insetInlineEnd`. Bubbles naturally settle on the correct side in RTL (mine = trailing edge = right in Arabic).

## Accessibility

- `role="log"` on thread container; new messages announced via `aria-live="polite"`.
- Each bubble is a `<li>` with timestamp + author name in a visually-hidden prefix for screen readers: `لين صلاح، الساعة 10:24:`.
- Failed messages focusable, `Enter` retries.

## Anti-patterns

- ❌ Own bubbles in `brand-600` fill — collides with CTAs.
- ❌ Different fonts for own vs. theirs.
- ❌ Timestamp on every bubble — only on last of a run or when gap > 10 min.
