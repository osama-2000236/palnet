# Journey & Dead Ends implementation review

Date: 2026-05-16  
Branch reviewed: `claude/naughty-goldberg-584085`  
Design source: `https://api.anthropic.com/v1/design/h/ULRUPVSBhMSKLfM2EymW9A?open_file=Journey+%26+Dead+Ends.html`

## Source read

The design bundle was fetched and extracted locally for review. The bundle README says to read the chat transcript first, then read `project/Journey & Dead Ends.html` in full, then follow imported/source files. The chat intent was a senior product/design audit of Palnet: inventory routes/components, identify dead ends, map zero/error states, and generate the most critical missing screen. The selected critical screen was `/settings/notifications` because it blocks notification rollout, expected user control, and compliance-style opt-outs.

Relevant source files in the bundle:

- `README.md`
- `chats/chat1.md`
- `project/Journey & Dead Ends.html`
- `project/Missing Elements UI Kit.html`
- `project/Product Health Report.md`
- `project/code/apps/web/src/app/[locale]/(app)/settings/notifications/page.tsx`

## What landed well

- `/settings/notifications` exists on web and follows the supplied screen structure: grouped notification sections, email/push switches, load skeleton, retry on load failure, save/revert workflow, success toast, and settings landing row.
- The notification preferences API/schema/migration are coherent: `NotificationPreferences` is shared, stored as JSONB, and `moderationAction` is enforced server-side as always on.
- The mobile twin exists and is reachable from mobile settings, which closes the lockstep parity gap called out by the plan.
- Feed dead-end work matches the Journey report: the left rail connection link now routes to `/network`, the count is fetched from `/connections/counts`, and the right rail uses retry chips instead of silently treating failed rails as empty.
- `/search` now distinguishes zero-results from API failure and gives an inline retry chip.
- `/in/[handle]` now has chrome for missing profiles, while non-404 profile errors keep a retry surface.
- `/onboarding` step-save errors are persistent until user action and use a live banner.
- Failed message sends now expose retry chips on web and native.
- The design-system atom APIs are now in place for `Switch`, `Dialog`, `Banner`, and `RetryChip`, which gives design a stable prop surface to refine later.

## Findings

### P1 - Disabled checked web switches lose their track color

`packages/ui-web/src/Switch.tsx` builds the class string without a separating space between the disabled fragment and checked fragment:

```tsx
(disabled ? "cursor-not-allowed opacity-55" : "") +
  (checked ? "bg-brand-600" : "bg-surface-sunken");
```

When a switch is both disabled and checked, Tailwind sees `opacity-55bg-brand-600` instead of separate utilities. This is visible in the smoke screenshot: locked `moderationAction` switches render nearly invisible/white instead of as a disabled-on state. Use `cx()` or include explicit trailing spaces between fragments.

### P1 - Native RTL switch thumb can move off-track

`packages/ui-native/src/Switch.tsx` sets the thumb at `left: PAD` and then applies `translateX: checked ? OFFSET * direction : 0`. In RTL, `direction` is `-1`, so a checked switch translates from `left: 2` to `left: -14`, outside the track. The design plan specifically called for RTL thumb direction; this needs a small geometry fix before relying on the native atom in Arabic.

### P2 - Mobile notification load failure can be mistaken for real defaults

`apps/mobile/app/(app)/settings/notifications.tsx` catches the initial GET failure, fills `prefs` and `pristine` with `DEFAULT_NOTIFICATION_PREFERENCES`, and renders the editable form. There is an error string later, but no load retry state. On a network/server failure, the user can edit and save over unknown existing server preferences. Web handles this correctly with a dedicated error surface and retry.

### P2 - Failed message state now has two retry affordances

`packages/ui-web/src/MessageBubble.tsx` and `packages/ui-native/src/MessageBubble.tsx` keep the failed status icon as a retry button and also render a `RetryChip`. The spec asked for the retry chip inline within the bubble; the extra tappable X is redundant and may confuse assistive tech. Prefer making the status icon non-interactive when the chip is present, or visually merge them into one retry control.

### P2 - Locale routing remains inconsistent

Some new/fixed links use `/${locale}/...`, but other shell and rail actions still push bare paths like `/network`, `/feed`, `/settings/blocked`, and `/login`. With `localePrefix: "always"` and default locale `ar-PS`, this can redirect English users back to Arabic unless next-intl middleware/cookie behavior rescues it. This is broader than Journey & Dead Ends, but future route work should standardize on locale-aware navigation helpers.

## Future reference

- Treat the design bundle as three related artifacts, not just the Journey HTML: Product Health gave the resilience/token risks, Missing Elements UI Kit defined the atom state expectations, and Journey selected the critical screen plus edge-case fixes.
- The current atom work is an MVP API scaffold. Design still owes final visuals and state matrices for `Switch`, `Dialog`, `Banner`, and `RetryChip`; do not overfit new screens to the current stub internals.
- Browser smoke covered the web happy path and simulated error states, but native RTL geometry needs simulator/device verification because it will not show up in web smoke or type checks.
- Keep screenshots in `.codex-live/screenshots/` useful for review, especially `settings-notifications.png`, which catches the disabled-switch issue despite all automated gates passing.
