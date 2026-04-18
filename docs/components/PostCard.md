# PostCard

> Location: `docs/components/PostCard.md`.
> Source: `packages/ui-web/src/PostCard.tsx` (mobile twin: `packages/ui-native/src/PostCard.tsx`).

## What it is

The feed post. Avatar + meta + body + optional media + reaction summary + action bar + expandable comments.

## API

```ts
type PostCardProps = {
  post: Post; // shared type from @baydar/api
  viewerId: string;
  onOpenProfile: (userId: string) => void;
  onToggleReaction: (postId: string) => Promise<void>;
  onOpenComments: (postId: string) => void;
  onRepost: (postId: string) => void;
  onShare: (postId: string) => void;
};
```

## Structure (top to bottom)

1. **Header** — Avatar (md) + name (`h3`) + headline (`small`) + timestamp (`caption`) + `…` menu button.
2. **Body** — `body` text, `whiteSpace: pre-wrap`, `line-height: 1.7`.
3. **Media** (if any) — full-bleed image(s), no side padding, maintain aspect.
4. **Stats row** — reaction pill + count (mono numeral) · `n تعليق · n إعادة نشر` on end side.
5. **Divider** — `line-soft`.
6. **Action bar** — 4 ghost action buttons, equal width: إعجاب · تعليق · إعادة نشر · إرسال.
7. **Comments (expanded)** — tinted sub-region with comment list + compose input. Shows only when opened.

## Behavior

- **Reaction**: optimistic. Toggle local state; on server echo, reconcile. If server rejects, revert + toast.
- **Comments**: click the comment action to expand inline. Don't navigate away. Infinite-scroll within the card if more than 5.
- **Repost**: opens a lightweight composer dialog prefilled with the original; on confirm, create a new post referencing this one.
- **Author click**: navigates to profile.

## States

- **Liked**: thumb icon filled, label = "أعجبني" (past tense), color = `brand-700`.
- **Hover on action**: bg = `surface-subtle`.
- **Pending post (optimistic)**: opacity 0.6, "جاري النشر..." label overlay.
- **Failed post**: bordered `danger`, retry button.

## RTL

- Action bar: icons stay on start side of their labels. No flipping.
- "Reply" arrow icon (if added): **does** flip (`rtl-mirror`).
- Reaction summary `جيم شحادة و ١٢ آخرون تفاعلوا`: numeral stays LTR via `dir="ltr"` or `unicode-bidi: isolate` — numerals always render left-to-right even inside Arabic text.

## Accessibility

- Header name + avatar = one combined link with `aria-label`.
- Action buttons have text labels (not icon-only); keyboard tabbable.
- Reaction count announced via `aria-live="polite"` when it changes.
- Comments region has `role="region"` `aria-label="تعليقات"`.

## Anti-patterns

- ❌ Showing 100+ comments inline — paginate at 5, link to full view.
- ❌ Moving the reaction button to a hover-reveal — always visible.
- ❌ Colored author name — `ink`, `h3` weight only.
