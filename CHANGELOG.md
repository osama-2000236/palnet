# Changelog

All notable Baydar changes are documented here.

## [Unreleased]

### Added

- Arabic search folding: `baydar_fold()` SQL function + rebuilt FTS GIN indexes and folded query side across people/posts/companies/jobs search and the jobs-list filter, so hamza/teh-marbuta/tashkeel variants match (احمد ↔ أحمد). JS twin `foldArabic()` powers `normalizeCity` and client suggestions.
- Jobs sector facet (`GET /jobs?industry=`) with `PS_INDUSTRIES` (NGO/international organizations first), filter UI on web + mobile, and canonical suggestions on the company form.
- Palestinian university suggestions in the education editors (web datalist, mobile fold-filtered chips) from the previously-unused `PS_UNIVERSITIES`.

### Fixed

- The mobile feed and search `ProvenanceLine` claimed an ordering neither endpoint performs — "Ordered by proximity to {city} first, then usefulness" over `FeedService`'s `createdAt desc` and "sorted by proximity, then relevance" over search's `updatedAt desc`. The component's own spec says it must state the mechanism, so both clauses now say what the query does. `proximityScore()` stays in `palestine.ts` with no caller by design: `NEXT-SESSION-PROMPT.md` §B12 phase 4 is what wires it.

### Removed

- Ponytail audit 8: deleted the native `AppShell` (287 lines + its test) — the mobile app has navigated with expo-router `<Tabs>` since `app/(app)/_layout.tsx` was written, so the hand-built tab bar was mounted by nothing but its own spec; the six local-wallet env vars (`JAWWALPAY_*` / `PALPAY_*` / `REFLECT_*`) and the `envKeys` lookup behind `WalletRegistry.availability()`, which asked whether credentials were present rather than whether a client exists to spend them — setting a merchant id would have offered the wallet as a real payment method and minted an invoice nobody could pay; the unused `@baydar/ui-tokens` dependency on `apps/mobile` (it reaches tokens through `@baydar/ui-native`); and `readRankingPrefs` + two now-private ranking helpers. Reaction geometry (`REACTION_TYPES`, `REACTION_PATHS`, `topReactions`) and the 622-character `GEAR_TEETH` cog moved to the new `@baydar/ui-tokens/glyphs` entry point — both design-system twins had declared them verbatim under comments that said so. Added `wallets.spec.ts` (the real registry was only ever reached through a mock) and a `moduleNameMapper` pinning ui-tokens to its build output under ui-web's jsdom Jest.
- Ponytail audit 5: deleted the non-functional `mobile-e2e.yml` scaffold workflow (verified a preview-build secret but never installed the APK or booted an emulator; `.maestro/` flows stay for local runs), the `MailService` delegation wrapper (consumers now `@Inject(MAIL_TRANSPORT)` directly), dead shared schemas (`schemas/user.ts` whole file, `BookmarkState`, `JobSearchQuery`, `ViewerConnectionState`), dead `formatCompact`, dead app-lib exports (`LinkingOptions`, `warningHaptic`/`errorHaptic` + the haptics table indirection, `apiErrorCode`, `THEME_CHOICES`), unread env vars (wallet `*_WEBHOOK_SECRET`/`*_BASE_URL`, Google OAuth trio — no OAuth code exists), the unused `@expo/vector-icons` mobile dep, and the internal-only `ILLUSTRATION_MOTIFS` barrel export. `lint:tokens` gained a preset-drift guard (every hex in `packages/config/tailwind-preset.js` must exist in ui-tokens source); `USER_PREMIUM_POINTS_PRICE` is now the single source for the premium points price (was hand-synced between `pricing.ts` and `karama.service.ts`).
- Ponytail audit 4: deleted the stale `design-handoff-2026-05/03-components/` + `04-screens/` source snapshots (~14.2k lines; referenced pain/problems/ask docs kept for the Pass 2 gate), the web write-only profile-completion cache and `clearDeviceId` in `lib/session.ts`, a twice-declared `CompanySearchRow` interface, a byte-copy premium `format.ts`, and the never-rendered Illustration `outline`/`block` direction kits (harvest-only now on web + native; kits recoverable from git history). Added shared `takePage()` and replaced the hand-rolled cursor-trim block in 8 list endpoints.
- Ponytail audit 3: deleted the stale `design-handoff-2026-05/code/` snapshot (merged into the repo tree 2026-06-04; AGENTS.md now points at the live tree), dead `NotificationsBell` (web) and `LanguageToggle` (mobile) components, and their orphaned mobile i18n keys (`common.language|arabic|english`).

### Fixed

- Refresh-token reuse detection was unreachable: the lookup filtered `revokedAt: null`, so replaying an already-rotated token 401'd before the burn-all-sessions branch could run, and only a concurrent race could trigger it. Its spec passed by mocking a state the real query cannot return.
- HyperPay webhook verification failed **open** — `if (!secret) return true` accepted any unsigned webhook whenever `HYPERPAY_WEBHOOK_SECRET` was unset, i.e. free premium for anyone who found the endpoint.
- JWT verification accepted any algorithm; now pinned to HS256 on both verify and sign.
- `POST /billing/checkout-session` accepted any `returnUrl`; now allowlisted against `BAYDAR_WEB_URL` + `CORS_ORIGINS`, and rejects http outside development.
- Concurrent "open DM" could create two 1:1 rooms for the same pair; serialized with a transaction-scoped advisory lock.
- Resending one `clientMessageId` un-archived a room for every member with no new message, letting a client undo a recipient's archive indefinitely.
- 38 hardcoded `textAlign: "right"` across mobile and ui-native rendered as **left** in Arabic (RN swaps left/right under `I18nManager.isRTL`) and stayed right in English — wrong in both. All now `"auto"`, with an eslint rule in the shared preset so the class can't return; `docs/design/MOBILE.md` no longer prescribes the bug.
- Money and dates rendered Latin digits on Arabic pages. `formatMoney`/`formatDate` hoisted into `@baydar/shared`, both app copies deleted, and nine web `Intl.DateTimeFormat` call sites routed through a shared `localeTag()` that forces Arabic-Indic digits.
- Onboarding always started blank on resume, and its prefill discarded anything typed while the profile fetch was in flight.
- Typing indicator used static tokens (no dark-mode flip), named the wrong member in group rooms, and italicised Arabic, which has no italic form.
- Seed left owner, a11y, and the twelve cohort accounts `isProfileComplete() === false`, so logging in as any of them landed on onboarding.
- Settings → Security sessions list now formats "last active" with the page locale via shared `formatRelativeTime` (was browser-default `toLocaleString()`, rendering English dates on Arabic pages).
- Profile edit basics form rendered raw `onboarding.firstName`/`onboarding.lastName` i18n keys (`as never` casts had silenced the missing-key type error); keys added to both web locales.

### Changed

- `.gitignore` now covers the agent scratch directories at the repo root. They were untracked but prettier still walked them: `pnpm format:check` reported 366 unformatted files from those alone, which hid real violations and failed the command on every local run.
- Updated repo docs to reflect the real current `main` state after Sprint 11.5.
- Recorded the April 28, 2026 cleanup plan and branch/artifact pruning record.
- Replaced stale legacy product-name, old realtime, old UI-kit, old mobile SDK, legacy package-scope, and greenfield sprint references in active docs.

### Current Baseline

- Next.js 15 web app, Expo SDK 54 / React Native 0.81 mobile app, NestJS REST API, Prisma/Postgres, SSE live updates, JWT refresh auth, R2 media uploads, Expo push device registration.
- Verification gate: `pnpm lint:tokens`, `pnpm format:check`, `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm --filter @baydar/db generate`.
