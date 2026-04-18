# MOBILE.md — mobile-specific overrides

> Location: `docs/design/MOBILE.md`.
> Mobile inherits everything from `DESIGN.md`. This file lists only what's different.

## Platform

- **Expo SDK 51+**, React Native 0.74+, TypeScript.
- `expo-router` for file-based routing mirroring the web app where possible.
- `react-native-reanimated` v3 for animation.
- `expo-font` for bundled IBM Plex Sans Arabic + Noto Naskh Arabic.
- `I18nManager.forceRTL(true)` at app boot. Restart required on first install — document this.

## Type scale — tighter than web

| Step | Web | Mobile |
|---|---|---|
| display | 36 | 28 |
| h1 | 26 | 22 |
| h2 | 19 | 18 |
| h3 | 16 | 16 |
| body | 15 | 15 |
| small | 13 | 13 |
| caption | 12 | 12 |

See `packages/ui-tokens/src/tokens.native.ts`.

## Layout overrides

- **Single column** everywhere. No 3-column Feed. The right-rail content (suggestions, jobs) becomes inline cards in the feed, inserted every 3–5 posts.
- **Horizontal padding** is 16pt (`space.4`), not 20. Tighter screens.
- **Cards go edge-to-edge** with 1px horizontal border only — no floating card look. We call this a `mobile-card` variant (or reuse `flat`).
- **AppShell** is a 5-item bottom tab bar, not top nav. See `AppShell.md`.

## Hit targets

- Minimum 44pt in both dimensions. Always.
- If a button looks smaller than 44pt, pad its `hitSlop` to compensate. Never shrink the tap area to match the visual.

## Interactions — mobile-specific

- **No hover states.** Design `pressed` states instead: opacity 0.85, scale 0.97, haptic `impactLight`.
- **Haptics on primary actions**: `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on Connect, Post, Like, Send.
- **Swipe actions** on list items: swipe message room → archive; swipe notification → dismiss. Use `react-native-gesture-handler`.
- **Pull to refresh** on every list screen (Feed, Network, Messages, Notifications). Native spinner, tinted `brand-600`.

## Navigation

- **Back gesture** must always work (iOS edge swipe, Android back).
- **Modals** via `expo-router` presentation: `"modal"` for full-screen flows (post composer, edit profile); `"transparentModal"` for confirmations.
- **Deep links**: `baydar://u/{handle}`, `baydar://post/{id}`, `baydar://messages/{roomId}`.

## Animations

- **Screen transitions**: default slide-from-end (flips correctly in RTL via I18nManager).
- **Skeleton shimmer**: 1.4s loop, same timing as web.
- **Message send**: bubble appears with a subtle `scale 0.9 → 1` + fade, 180ms.
- **Reaction toggle**: icon scale punch `1 → 1.3 → 1`, 220ms, `ease-emphasized`.
- Never block the UI with animations longer than 300ms.

## Images

- Use `expo-image` with caching.
- Provide `blurhash` for every uploaded photo.
- Avatar fallback (no image) = initials on paletted bg, same as web.

## Safe areas

Wrap every screen in `SafeAreaView` from `react-native-safe-area-context`. AppShell tabs read bottom inset and pad accordingly.

## Text input

- `textAlign: "right"` for Arabic inputs (I18nManager handles it in most cases, but be explicit).
- `keyboardType="email-address"` for email inputs also sets LTR entry.
- Disable autocorrect on handle, code, URL inputs.

## Accessibility

- `accessibilityLabel` on every touchable. No icon-only without label.
- `accessibilityRole`: `"button"`, `"header"`, `"link"`, `"image"`, etc.
- `accessibilityState` for selected/disabled/checked.
- Minimum font scale support to 200% — test at iOS Dynamic Type XXL.

## Performance

- `FlatList` / `FlashList` for every scrolling list. Never `ScrollView` with mapped content for > 20 items.
- `react.memo` on `PostCard`, `MessageBubble`, `ConnectionRow` — they render many times.
- Image preloading for the first 3 posts in the feed.

## What's NOT on mobile (yet)

- Rich text editor — simple multi-line `TextInput` for MVP.
- Drag-to-reorder (experiences in profile edit) — use up/down buttons instead.
- Keyboard shortcuts.
