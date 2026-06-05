# Navigation Chrome

`DESIGN.md` remains the source of truth. Navigation must stay Arabic-first, RTL-safe, tokenized, and consistent between web app chrome and mobile bottom tabs.

## Web

- Authenticated web uses the top `AppShell`.
- Search belongs in the shell where possible.
- Active nav uses olive token styling.
- Directional icons need `.rtl-mirror`.
- Icon-only actions require `aria-label`.
- Onboarding renders without `AppShell`.

Primary destinations:

- Feed
- Network
- Jobs
- Messages
- Notifications
- Search
- Profile
- Settings

Settings subroutes:

- `/settings/account`
- `/settings/notifications`
- `/settings/privacy`
- `/settings/security`
- `/settings/blocked`

## Mobile

- Authenticated mobile uses bottom tabs.
- Visible tabs stay focused: Feed, Network, Messages, Notifications, Profile.
- Jobs, search, composer, settings, employer, detail, and edit routes are pushable hidden routes.
- Bottom tab height uses `nativeTokens.chrome.tabHeight` plus safe-area bottom inset.
- Each tab item must preserve a minimum 44pt touch target.
- Onboarding and message-room detail hide the tab bar when focus is required.

Hidden settings routes registered in the tab layout:

- `settings/index`
- `settings/account`
- `settings/notifications`
- `settings/privacy`
- `settings/security`
- `settings/blocked`

## Badge Rules

- Notification badge shows unread count.
- Counts over 99 display `99+`.
- Badges must not shift tab layout.
- Web and mobile badges use accent/semantic tokens, never generic red/blue scales.

## Change Gate

Do not change tab count, badge behavior, route visibility, or search placement without updating this file, `DESIGN.md`, and `docs/design/SCREENS.md`.
