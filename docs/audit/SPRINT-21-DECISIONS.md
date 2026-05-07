# Sprint 21 Decisions

## Mobile Tabs

The authenticated mobile tab bar has exactly five visible tabs: Feed, Network, Messages, Notifications, and Me. Composer, Jobs, Search, detail routes, onboarding, and settings routes remain pushable hidden routes. Search is reached from the Feed AppHeader and Jobs remain reachable from Feed and Search.

## Notification Dismissal

Notification dismissal is a viewer-owned soft delete. The API sets `Notification.dismissedAt`, list/count/read paths ignore dismissed rows, and `DELETE /notifications/:id` returns raw `204 No Content` for owned rows. Mobile dismissal uses a logical trailing swipe: LTR reveals the right-side action, RTL reveals the left-side action. Web dismissal stays button-only.

## Toast Primitive

Sprint 21 uses in-repo toast primitives in `@baydar/ui-web` and `@baydar/ui-native` instead of adding a toast library. Both expose matching `Toast` props (`message`, `kind`, `onDismiss`) and `useToast()` with transient in-memory toasts only. Toast persistence across navigations remains out of scope.

## Dependencies

The only approved new mobile dependencies are `expo-file-system` and `expo-sharing`, pinned to Expo SDK 54 bundled versions. Migration deployment remains out of scope; only the reversible Prisma migration file is committed to the worktree.
