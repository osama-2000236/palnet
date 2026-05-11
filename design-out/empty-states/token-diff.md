# Token diff — empty-state illustration scale

Single token group added. Reuses existing brand colors via `currentColor` (stroke) and `var(--brand-50)` / `nativeTokens.color.brand50` (single fill region). No new color tokens.

## TypeScript source — `packages/ui-tokens/src/index.ts`

```diff
   chrome: {
     navHeight: 56,
     maxContentWidth: 1128,
     mobileTabHeight: 64,
   },
+  // Empty-state illustrations — see design-out/empty-states/style-direction.md.
+  // Sizes are intrinsic SVG dimensions; the EmptyState component picks one per surface density.
+  illustration: {
+    size: { sm: 96, md: 128, lg: 160 },
+    stroke: 2,
+  },
 } as const;
```

## Web CSS vars — `packages/ui-tokens/src/tokens.css`

```diff
   --dur-fast: 80ms;
   --dur-base: 120ms;
   --dur-slow: 240ms;
+
+  /* Empty-state illustrations */
+  --illustration-sm: 96px;
+  --illustration-md: 128px;
+  --illustration-lg: 160px;
+  --illustration-stroke: 2px;
 }
```

## React Native — `packages/ui-tokens/src/tokens.native.ts`

```diff
   chrome: {
     navHeight: 56,
     tabHeight: 64,
     minHit: 44,
   },
+  illustration: {
+    size: { sm: 96, md: 128, lg: 160 },
+    stroke: 2,
+  },
 } as const;
```

## Rationale

- **Three sizes only** (sm/md/lg) — same restraint as existing radii and shadow tables. `md` (128) is the default; `sm` (96) is used in compact-density rails; `lg` (160) is held back for future hero-empty surfaces.
- **stroke=2** is a token, not a hardcoded `<svg strokeWidth="2">` literal. All illustrations import it from `nativeTokens.illustration.stroke`.
- **No illustration color tokens.** The component wrapper sets `text-brand-700` (web) / `color: brand700` (native) on the SVG container, and every shape draws with `stroke="currentColor"`. The single tinted region uses the already-shipped `brand-50`. Adding `illustration.tint` would duplicate.
- **No motion entries.** Illustrations are static. If we ever animate them, durations come from `motion.duration.{fast,base,slow}` — already in tokens.

## Token-lint status

`pnpm lint:tokens` reports zero new hits for this PR. The single pre-existing hit (`apps/web/src/app/[locale]/(auth)/login/page.tsx:8`, `bg-gray-100`) is unrelated to empty states and is not addressed here.
