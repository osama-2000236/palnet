# Open Design Implementation Prompt - Baydar Web and Mobile

Use this prompt when implementing Baydar UI work across web and Expo mobile. It is intentionally explicit because this project has multiple design sources and a dirty worktree.

```text
You are implementing Baydar through Open Design, not from taste.

Read first, in this order:
1. C:\LinkedIn\open-design\README.md
2. C:\LinkedIn\open-design\QUICKSTART.md
3. C:\LinkedIn\open-design\docs\modes.md
4. C:\LinkedIn\open-design\docs\design-systems.md
5. C:\LinkedIn\open-design\apps\daemon\src\prompts\discovery.ts
6. C:\LinkedIn\open-design\apps\daemon\src\prompts\directions.ts
7. C:\LinkedIn\open-design\apps\daemon\src\prompts\system.ts
8. C:\LinkedIn\open-design\design-templates\web-prototype\SKILL.md
9. C:\LinkedIn\open-design\design-templates\web-prototype\references\checklist.md
10. C:\LinkedIn\open-design\design-templates\mobile-app\SKILL.md
11. C:\LinkedIn\open-design\design-templates\mobile-app\references\layouts.md
12. C:\LinkedIn\open-design\design-templates\mobile-app\references\checklist.md
13. C:\LinkedIn\open-design\design-templates\dashboard\SKILL.md
14. C:\LinkedIn\open-design\design-templates\critique\SKILL.md
15. C:\LinkedIn\DESIGN.md
16. C:\LinkedIn\BRAND.md
17. C:\LinkedIn\docs\design\RTL.md
18. C:\LinkedIn\docs\design\MOBILE.md
19. C:\LinkedIn\docs\design\NAV.md
20. C:\LinkedIn\docs\design\PARITY.md
21. C:\LinkedIn\docs\design\SCREENS.md
22. C:\LinkedIn\docs\design\open-design-audit.md
23. Zip handoff files from C:\Users\osama\Downloads\1652025 design upgrades.zip, especially Product Health Report, Sprint 1 Deliverables, Sprint 2 Deliverables, Missing Elements UI Kit, Resilience Pack, and proposed code files.

Before using the zip:
- Extract it to a temporary folder.
- Inventory every proposed file path.
- Diff every proposed snippet against the current repo.
- Never paste zip code blindly.
- Treat zip files as stale evidence unless the current repo still has the same gap.

Authority order:
1. Baydar DESIGN.md wins brand, colors, typography, spacing, RTL, screen composition, component intent, and "what not to do" conflicts.
2. Baydar companion docs win platform-specific details:
   - BRAND.md for voice and naming
   - RTL.md for logical CSS and direction behavior
   - MOBILE.md for Expo, safe areas, 44pt targets, FlatList, haptics, and native accessibility
   - NAV.md, PARITY.md, and SCREENS.md for app structure
3. Open Design wins method:
   - source preflight
   - prompt layering
   - template/checklist use
   - anti-slop rules
   - mobile archetype discipline
   - 5-dimension critique
4. Zip handoff supplies intent and examples only.
5. Current repo patterns win implementation style.

Brand contract:
- Baydar is Arabic-first, professional, warm, local, and trustworthy.
- Primary color is olive.
- Accent color is terracotta.
- Surfaces are warm paper, limestone, and ink.
- The UI should feel like a serious regional professional product, not generic SaaS.
- Do not make Baydar a LinkedIn clone.

Hard visual rules:
- No Tailwind blue.
- No generic SaaS blue.
- No dark mode.
- No decorative gradients, orbs, bokeh, or hero chrome.
- No nested cards.
- No fake metrics.
- No filler copy.
- No emoji in product chrome.
- No hardcoded colors, spacing, font sizes, radii, shadows, or breakpoints in screen files.
- No multiple primary commit CTAs on one screen.
- No in-app prose explaining how to use the UI unless it is real product copy.

Hard implementation rules:
- Add or change tokens in packages/ui-tokens/src/index.ts first.
- Regenerate packages/ui-tokens/src/tokens.css and packages/ui-tokens/src/tokens.native.ts from the token source.
- Use shared primitives from @baydar/ui-web and @baydar/ui-native whenever they exist.
- Keep shared prop names aligned across platforms:
  - variant
  - size
  - disabled
  - loading
  - leading
  - trailing
  - label
  - helperText
  - error
  - selected
  - onClick for web
  - onPress for native
- Do not change backend or database APIs unless the user explicitly asks.
- Missing backend-backed settings must be honest:
  - show a usable layout
  - mark controls disabled or coming soon where needed
  - do not fake successful saves
- The worktree may already be dirty. Do not revert unrelated changes.

Baydar field-row pattern:
1. Compact header.
2. Search entry.
3. Segmented olive control.
4. Composer entry on feed.
5. Profile completion rail where relevant.
6. Dense record cards.
7. One terracotta commit action for the screen's main commit moment.

Web contract:
- Use logical CSS properties only.
- Build RTL first, then verify LTR.
- App surfaces are dense and scannable.
- Use 3-column feed only on desktop widths where Baydar allows it.
- Collapse to one column on mobile widths.
- Use tokenized focus-visible styles.
- Every icon-only action has aria-label.
- Every fetch screen has loading, empty, error, offline/retry, disabled, and success states where relevant.
- Verify at widths 360, 390, 430, 600, 820, 1024, 1366, 1440, and 1920.

Mobile contract:
- Mobile is not squeezed desktop.
- One column.
- 16pt horizontal padding.
- SafeAreaView from react-native-safe-area-context.
- Bottom tabs for app chrome.
- Minimum 44pt tap targets.
- hitSlop for visually small touchables.
- FlatList or FlashList for long lists.
- Pull-to-refresh for Feed, Network, Messages, Notifications, and other list screens.
- Haptics on commit actions.
- accessibilityLabel and accessibilityRole on touchables.
- accessibilityState for selected, disabled, checked, and expanded states.
- Support Dynamic Type to 200%.

Screen implementation matrix:

Public web:
- Landing:
  - real Baydar first viewport signal
  - no generic marketing filler
  - primary and secondary CTA
  - responsive RTL and LTR
- Root not-found:
  - tokenized styling
  - route recovery
  - localized where practical
- Root/global error:
  - retry action
  - home route
  - tokenized styling

Auth:
- Login:
  - validation
  - loading
  - invalid credentials
  - disabled submit
  - forgot link
- Register:
  - validation
  - loading
  - success/verify handoff
- Forgot/reset:
  - sent state
  - expired token state
  - disabled submit
- Onboarding:
  - bare shell
  - progress
  - validation
  - retry
  - success handoff

Authenticated web:
- App shell:
  - compact top chrome
  - search entry
  - active nav
  - loading
  - offline
  - session expired
  - focus-visible navigation
- Feed:
  - 3-column field-row desktop
  - composer entry
  - profile completion rail
  - skeleton
  - empty
  - API error
  - offline
  - disabled composer
  - post success
- Jobs:
  - search and filters
  - loading
  - empty
  - no results
  - apply disabled
  - retry
- Messages:
  - room list plus thread
  - room loading
  - empty rooms
  - failed rooms
  - empty thread
  - send pending
  - send failed
  - offline
- Network:
  - filters
  - dense rows
  - loading
  - empty
  - pending
  - connect success/failure
- Search:
  - initial state
  - loading
  - no results
  - error
  - mixed RTL/LTR query
- Notifications:
  - loading
  - empty
  - read/dismiss success
  - offline
- Profile and self-profile:
  - loading
  - missing profile
  - empty sections
  - connect/message/edit states
- Settings:
  - account
  - notifications
  - privacy
  - security
  - disabled unsupported saves
  - no fake success

Mobile:
- App shell:
  - bottom tabs
  - safe area
  - badge
  - selected state
  - session/offline indicators
- Feed:
  - FlatList
  - pull-to-refresh
  - composer entry
  - inline rail cards
  - skeleton
  - empty
  - error
  - offline
- Composer:
  - modal or focused screen
  - draft
  - disabled submit
  - post success
  - post failure
  - haptic on commit
- Jobs:
  - filter chips
  - list
  - refresh
  - empty
  - apply
  - retry
- Messages and room:
  - FlatList rooms
  - safe keyboard layout
  - send pending
  - send failed
  - offline
- Network:
  - list plus filters
  - refresh
  - empty
  - connect haptic
  - pending
- Search:
  - search-first
  - initial
  - loading
  - no results
  - mixed direction
- Notifications:
  - refresh
  - empty
  - read/dismiss
- Profile:
  - header
  - sections
  - loading
  - empty sections
  - edit state
- Settings:
  - list/detail controls
  - disabled unsupported settings
  - honest state copy
- Auth/onboarding:
  - no app chrome until complete
  - validation
  - retry
  - success

Implementation order:
1. Produce docs/design/open-design-audit.md and docs/design/open-design-implementation-prompt.md.
2. Normalize tokens and UI primitives.
3. Implement web app shell and resilience states.
4. Implement web core screens.
5. Implement mobile parity screens.
6. Verify with tests, screenshots, accessibility, and Open Design critique.

Static verification commands:
- pnpm lint:tokens
- pnpm type-check
- pnpm test
- pnpm --filter @baydar/ui-web type-check
- pnpm --filter @baydar/ui-web test
- pnpm --filter @baydar/ui-native type-check
- pnpm --filter @baydar/ui-native lint
- pnpm --filter @baydar/web type-check
- pnpm --filter @baydar/web test
- pnpm --filter @baydar/mobile type-check
- pnpm --filter @baydar/mobile lint
- pnpm --filter @baydar/mobile test

Browser verification:
- Start the local web dev server.
- Capture and inspect screenshots for ar-PS RTL and en LTR.
- Use widths 360, 390, 430, 600, 820, 1024, 1366, 1440, and 1920.
- Verify the core flows:
  - landing CTA
  - login/register/forgot
  - feed retry/empty
  - jobs filters
  - message room
  - profile
  - search
  - notifications
  - settings

Mobile verification:
- Run Expo type-check, lint, and tests.
- Run Maestro smoke flows where available.
- Verify:
  - bottom tabs
  - safe areas
  - 44pt targets
  - pull-to-refresh
  - message send
  - composer
  - offline banner
  - accessibility labels and roles

Open Design critique gate:
Score every production screen 1 to 10 in:
1. Philosophy
2. Hierarchy
3. Detail
4. Functionality
5. Innovation/restraint

No screen ships below 7/10 in any dimension.

When a screen fails:
- name the failing dimension
- cite the exact evidence
- patch the issue
- rerun the relevant static, visual, or accessibility check
- record the new score
```

## Working Notes For Future Implementers

- Keep code waves small. The repo is intentionally allowed to be dirty, so broad formatting or refactors can hide unrelated changes.
- Prefer adding reusable primitives over app-local duplicates only when at least three screens need the behavior.
- For settings screens without backend support, use disabled controls and clear state copy rather than optimistic save flows.
- For mobile parity, start with shared primitives and screen shell behavior before large route refactors.
- For web parity, normalize resilience surfaces before polishing dense feature screens.
