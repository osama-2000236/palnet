# Mobile application audit

Date: 2026-11-12  
Scope: the current (including modified and untracked) `apps/mobile` tree, compared with `apps/web` and `packages/shared`.  
Method: static source, navigation, schema, API, test, and configuration review. This report does not modify application source.

## Executive summary

The mobile app has substantial coverage of the main social journeys, and several previously risky areas are now implemented correctly: refresh requests are single-flight, account deletion requires the typed server confirmation, logout clears the session, message retries reuse their client ID, and list screens generally support cursors.

The largest remaining problems are reachability and parity rather than missing route files:

1. **Karama redemption can be repeated after an ambiguous failure** because each retry gets a new idempotency key.
2. **The settings hub and every employer screen lack an in-app entry point.** In particular, the working notification-preferences screen is unreachable through normal navigation.
3. **A message thread exposes only its latest 30 messages.** Older pages cannot be loaded, unlike web.
4. **Language selection is not mounted, and native startup never loads the saved locale.** The preference therefore cannot be changed in the UI and would not survive restart if set programmatically.
5. **Temporary refresh-network failure clears the login.** Account export also bypasses the shared refresh path.
6. **Post deep links discard their target post.** The feed receives `postId` but never reads it.
7. **Composer upload failures are not caught**, while Karama remains English-only in the Arabic-first app.

No source file is an unconditional deletion solely because it is hidden from the tab bar: Expo Router registers files implicitly, and several hidden routes are deliberately reachable by push or deep link. `LanguageToggle.tsx` and the disabled privacy/security placeholders are conditional deletion candidates only if product decides not to expose those journeys.

## Confidence and verification limits

- **Confirmed** means the behavior follows directly from current source and referenced web/shared code.
- **Not runtime-verified:** Android/iOS rendering, Expo Router behavior on a device, native RTL restart requirements, SSE reconnection, push delivery, file sharing, actual API responses, accessibility services, Maestro flows, and EAS builds.
- No emulator, physical device, Maestro flow, iOS build, or live API was exercised for this audit.
- The dirty worktree was audited as found. Untracked `messages`, `onboarding`, and `profile-edit` components are included; conclusions are not based on their old committed versions.

## Prioritized findings

### P1 — High

#### M1. Karama retries are not idempotent across attempts

**Evidence:** `apps/mobile/app/(app)/me/karama/index.tsx:48-59` calls `makeIdempotencyKey(reward)` inside `redeem`. A failed request therefore gets a different key when the user taps Redeem again. If the first request redeemed server-side but its response was lost, the retry can redeem a second time.

**Impact:** duplicate points expenditure and duplicate reward activation after a timeout/network ambiguity.

**Web comparison:** web also generates a key per call, so this is not a mobile-only regression; mobile must not copy that behavior for a retriable financial/reward mutation.

**Required direction:** create the key once for a user redemption attempt and retain it until a definitive success or a new, explicitly initiated operation. Add a retry-after-response-loss test. This is distinct from message retry, which correctly preserves `clientMessageId`.

#### M2. Notification, privacy, and security settings have no normal navigation entry

**Evidence:** `app/(app)/settings/index.tsx:22-48` contains the links, but `app/(app)/me/index.tsx:142-168` links only to Karama, blocked users, and account. Searches found no `router.push`/`Link` to `/settings` itself. `app/(app)/_layout.tsx:305-310` marks these routes hidden, which removes tab entries but does not provide another entry point.

**Impact:** the implemented `/me/notification-preferences` journey in `settings/notifications.tsx` cannot be opened through the app UI. Privacy/security are also unreachable, although those two are explicitly disabled placeholders rather than working features.

**Required direction:** link Profile to the settings hub, or add individual entries for supported screens. Do not expose disabled privacy/security controls as if functional.

#### M3. Employer journeys are implemented but unreachable in-app

**Evidence:** employer list → jobs → applicants navigation exists within `app/(app)/employer/index.tsx`, `employer/[slug]/index.tsx`, and `employer/[slug]/[jobId].tsx`. Outside those files, `_layout.tsx:313-315` only hides the routes. No mobile navigation source references `/employer`.

**Impact:** a company editor cannot discover or open their employer inbox without an externally constructed route/deep link.

**Required direction:** expose employer entry only for users/companies for whom it is relevant, using the existing `/companies/me` result and viewer role.

#### M4. Threads cannot load messages older than the latest 30

**Evidence:** `src/components/messages/useRoomThread.ts:64-79` requests `messages?limit=30`, reverses that page, and discards `page.meta.nextCursor` and `hasMore`. `app/(app)/messages/[roomId].tsx:127-212` has refresh but no older-page control or cursor callback.

**Impact:** history is silently truncated. Unread positioning/counts also operate only on the retained 30-message window.

**Web comparison:** `apps/web/.../messages/_hooks/useRoomMessages.ts:78-79,123-137` retains cursor state and prepends older pages; its interface exposes `loadOlder`.

**Required direction:** retain pagination metadata and prepend older pages while preserving scroll position and realtime/optimistic reconciliation.

### P2 — Medium

#### M5. Locale switching is absent and saved native locale is never restored

**Evidence:** `src/components/LanguageToggle.tsx` has no importer outside itself. `src/i18n/index.ts:40-45` exports `loadStoredAppLocale`, but there are no callers. On native, `getInitialLocale()` uses the device locale (`src/lib/locale.ts:39-46`), so a stored preference is ignored at startup. `app/_layout.tsx` imports i18n for side effects but never invokes the loader.

**Impact:** users cannot switch Arabic/English in the app; even a preference written through the unused toggle would not be restored after native restart. Direction changes may additionally require an app reload on native; that behavior is not runtime-verified here.

**Required direction:** mount the existing selector in an appropriate auth/settings surface and invoke the stored-locale loader before interactive startup. Test both locales and native relaunch.

#### M6. A transient refresh failure logs the user out

**Evidence:** `src/lib/api.ts:152-166` catches every refresh error, calls `clearSession()`, and redirects to login. `request()` converts a connectivity failure to `ApiRequestError(0, "NETWORK_ERROR")` at lines 133-143. There is no distinction between authentication rejection and temporary network/server failure.

**Impact:** an expired access token plus a tunnel, airplane-mode transition, DNS failure, or 5xx can destroy a locally valid refresh session instead of offering offline/retry behavior.

**Required direction:** clear and redirect only on confirmed invalid/expired/revoked credentials; propagate transient failures to the caller. Add concurrent-refresh tests for 401, network error, malformed success, and server error.

#### M7. Account export bypasses token freshness and authenticated retry

**Evidence:** `app/(app)/settings/account.tsx:24-49` reads the raw access token and calls global `fetch` directly. It does not use `getFreshAccessToken`, `requestWithAuth`, or a 401 retry, unlike normal API calls.

**Impact:** export fails with the generic error when the stored access token is near/past expiry even if a valid refresh token exists.

**Required direction:** obtain a fresh token through the shared auth path and handle a 401 consistently, while retaining the response body as a file rather than schema-parsing it.

#### M8. Post deep links do not open the requested post

**Evidence:** `src/lib/linking.ts:49-51` maps `/post/:id` to `/(app)/feed` with `params.postId`. `app/(app)/feed.tsx` never calls `useLocalSearchParams` and contains no `postId` read. There is no post-detail route.

**Impact:** opening a shared post lands on an ordinary feed, potentially without the requested post in its first page. Profile, message, job, verification, and reset mappings do target their corresponding dynamic screens.

**Required direction:** add/focus a post detail destination or fetch and present the requested post; do not silently discard the ID.

#### M9. Composer upload errors bypass the composer error state

**Evidence:** `app/(app)/composer.tsx:54-92` wraps upload only in `try/finally`; there is no `catch`. Presign, local-file read, or PUT failures reject the picker callback, while `setError` is used only by post submission.

**Impact:** failed attachment selection can become an unhandled rejection with no localized inline error or retry feedback. The rest of the post remains editable, but the user is not told why no attachment appeared.

**Required direction:** catch upload errors through `apiErrorMessage`/upload-specific messaging and reset uploading state in `finally` as it already does.

### P3 — Low / parity and maintainability

#### M10. “Load more” replaces the blocked-user page instead of appending

**Evidence:** `settings/blocked.tsx:13-16` stores one cursor and renders only `blocked.data.data`; lines 58-67 replace that cursor. `src/api/safety.ts` keys the query by cursor but does not accumulate prior pages in this screen.

**Impact:** moving to the next page removes the previous page from view. This differs from append-style feed/jobs/notifications pagination.

**Required direction:** accumulate unique pages or use an infinite query.

#### M11. Karama is not localized

**Evidence:** `app/(app)/me/karama/index.tsx:82-85,96-99,106-117,124-128,142-151` hard-codes English headings, reward copy, costs, redemption labels, and ledger reasons. The Profile entry label is also hard-coded as `Karama Points` (`me/index.tsx:142-150`). Arabic is the default locale.

**Impact:** a prominent profile journey breaks Arabic-first parity and locale switching.

**Required direction:** move user-visible strings and reason/reward mappings into `ar.json` and `en.json`; use locale-aware number formatting.

#### M12. Several components exceed the repository’s 300-LOC limit

Examples include `app/(app)/_layout.tsx` (403), `me/index.tsx` (454), `settings/notifications.tsx` (315), `messages/[roomId].tsx` (333), `jobs/[id].tsx` (330+), `jobs/index.tsx` (250+ plus filter sheet), and the large onboarding component collection entry points. This is a maintainability/convention issue, not proof of runtime failure. Split along existing hooks/cards rather than introducing a new architecture.

## Journey comparison with web/shared APIs

| Journey | Mobile contract and coverage | Web/shared comparison | Assessment |
|---|---|---|---|
| Register, login, forgot/reset, verify | Yup/react-hook-form auth screens use shared auth actions and body-token transport | Same API surface; mobile stores refresh material in SecureStore | Covered statically; device validation absent |
| Session/refresh | Zod-validated responses, body transport, single-flight refresh | Web uses cookies and a queue | Core queue is sound; M6 is the exception |
| Onboarding gate | Profile completeness checked through shared schema; bounded local completion cache | Shared `isProfileComplete` and profile APIs | Covered; multi-call resume behavior not live-tested |
| Onboarding form | Identity, handle/profile, location, background, photo, suggestions | Uses shared profile/media/connections endpoints | Non-API exceptions receive a generic localized error; no current `instanceof Error`-only defect |
| Feed/list pagination | Cursor append, refresh, errors, composer entry | Shared `cursorPage(Post)` | Covered; stale-response behavior under rapid repeated loads not runtime-tested |
| Composer | Shared `CreatePostBody`, media presign/PUT | Same media contract | Posting covered statically; M9 affects attachment failure |
| Comments/reactions/profile view | Nested comment pagination and post mutations; public/self profile and connection actions | Shared post/comment/profile/connection APIs | Covered statically |
| Jobs | Filtered cursor list, detail, cover-letter application | Shared job schemas and apply endpoint | Core journey present |
| Network | Accepted/incoming/outgoing filters and accept/decline/withdraw/remove | Shared connection DTOs | Core journey present |
| Messaging rooms/new group | Room list, contact search/selection, group creation | Shared messaging endpoints | Core journey present |
| Message thread | Latest page, SSE, optimistic send/retry, edit/delete/report/read state | Same event/message schemas | M4: missing older history; typing indicators not at mobile parity |
| Message idempotency | `clientMessageId` created once per optimistic item and reused by retry | Same reconciliation principle as web | Correct in current source |
| Notifications | Cursor list, mark-read, dismiss with rollback, SSE badge | Shared preferences/events/endpoints | List covered; preferences blocked by M2 |
| Account export/delete | File export/share and typed `DELETE_MY_ACCOUNT` confirmation | Same account endpoints and confirmation | Delete/logout correct statically; M7 affects export freshness |
| Blocked users | React Query list and unblock | Shared safety APIs | M10 pagination behavior |
| Privacy/security | Informational disabled controls | Web has dedicated screens | Not implemented mobile features; do not describe them as working |
| Employer | Company list, job/applicant list, status update | Shared company/job/application APIs | Implemented but M3 blocks discovery |
| Karama | Balance, ledger, reward redemption | Shared DTOs and endpoint | M1 idempotency and M11 localization |
| Deep links | Profile, post, message, job, verify, reset URL parsing | Same public web paths | M8 affects post only |
| Localization/offline | ar-PS/en resources, RTL direction, NetInfo banner and auth guards | Locale parity goal | M5; native reload behavior unverified |

## Deletion and simplification candidates

| Candidate | Recommendation | Reason / condition |
|---|---|---|
| `src/components/LanguageToggle.tsx` | **Wire it in; delete only if language selection is explicitly out of scope** | Unreferenced today, but it is the only implemented selector and M5 needs it |
| `settings/privacy.tsx`, `settings/security.tsx` | **Keep hidden or remove as placeholders until backed by APIs** | Disabled UI and explanatory strings are not user functionality; deletion is reasonable if placeholder screens are not wanted |
| `settings/index.tsx` | **Do not delete if using a hub; alternatively replace with direct Profile links** | Currently unreachable but it is the natural minimal fix for M2 |
| `src/lib/idempotency.ts` | **Keep** | Used by Karama; fix call-site key lifetime rather than deleting the helper |
| Hidden Expo routes | **Do not infer dead code from `href: null`** | Jobs, search, composer, profile detail/edit, onboarding, settings, employer, and message routes can be pushed or deep-linked without tab entries |
| Android build/cache output (`.cxx`, `.gradle`, `build`, generated CMake/Ninja files) | **Exclude/clean as generated artifacts, not as app-source simplification** | They account for most raw files and are regenerated by native builds |
| `android/app/debug.keystore` | **Do not treat as authored source or publish as production credentials** | Standard local debug signing material; outside source-content audit |

No other unconditional source deletion is supported by the evidence. “Unused” route or component claims based only on static import searches would be unsafe under Expo Router.

## Rejected or already-resolved earlier concerns

- **Profile dates:** `src/components/profile-edit/shared.tsx:54-58` converts parseable input with `toISOString()`, and `ExperiencesCard.tsx:24-43` validates with shared `ExperienceBody` before POST. This is compatible with `z.string().datetime()` in `packages/shared/src/schemas/profile.ts:19`. Reject the earlier “raw permissive timestamp reaches strict API” concern. Input remains permissive UX, not a contract violation.
- **Onboarding exceptions:** `app/(app)/onboarding.tsx:256-264` maps `ApiRequestError` through localized API errors and all other thrown values to a generic localized error. It does not silently ignore non-`Error` failures.
- **Refresh concurrency:** `src/lib/api.ts:9,152-166` shares one `refreshPromise`; do not report parallel independent refreshes.
- **Message retry identity:** `useRoomThread.ts:174-210` passes the existing client ID to `sendBody` on retry, and `thread-helpers.ts:18-27` reconciles by server ID or client ID.
- **Message-list pagination:** room-list pagination exists where implemented; the confirmed missing pagination is specifically **inside a thread** (M4).
- **Logout/deletion:** logout explicitly clears local session; deletion submits the exact typed confirmation and clears only after API success.

## Test coverage observations

Existing tests cover auth forms, API cache headers, shell registration, account deletion, notification settings, feed empty state, message list, onboarding, observability, profile state, search, session storage, and blocked users. They do not establish the missing behaviors above.

Highest-value additions:

1. refresh network failure preserves session; refresh 401 clears it; concurrent callers share one request;
2. Karama ambiguous-response retry reuses the same key;
3. thread older-page prepend, deduplication, and scroll anchoring;
4. startup restores stored native locale and selector is reachable;
5. normal navigation reaches settings and employer screens;
6. post deep link opens the requested post;
7. export refreshes an expired access token;
8. composer upload rejection displays an error;
9. blocked-user pages append without duplicates.

The three Maestro YAML flows cover login/feed, post composition, and message sending only. Their README describes manual/local or opt-in CI execution; no result is claimed here.

## File/evidence matrix

Every retained text/config/native path was assigned to an audit area. Asset presence and references were checked; binary image rendering was not visually inspected.

| Area | Files | Review focus |
|---|---|---|
| Root configuration | `.env.example`, `.eslintrc.cjs`, `.gitignore`, `app.config.js`, `babel.config.js`, `eas.json`, `expo-env.d.ts`, `global.css`, `index.ts`, `jest-env.ts`, `jest-setup.ts`, `jest.config.js`, `metro.config.js`, `nativewind-env.d.ts`, `package.json`, `tailwind.config.js`, `tsconfig.json` | Expo SDK/config, env requirements, native build setup, scripts, test tooling |
| E2E | `.maestro/README.md`, `.maestro/login-to-feed.yaml`, `.maestro/compose-post.yaml`, `.maestro/send-message.yaml` | Fixture assumptions and actual journey coverage |
| Root routing | `app/_layout.tsx`, `app/index.tsx` | Providers, startup, deep-link dispatch, landing/auth routing, M5 |
| Authenticated shell | `app/(app)/_layout.tsx` | Tabs, hidden routes, profile gate, notification SSE, M2/M3 |
| Feed/content | `app/(app)/feed.tsx`, `composer.tsx`, `search.tsx`, `src/components/CommentsList.tsx`, `src/components/rows/PostRow.tsx` | Feed/search/composer/comments/reactions, M8/M9 |
| Jobs/employer | `app/(app)/jobs/index.tsx`, `jobs/[id].tsx`, `employer/index.tsx`, `employer/[slug]/index.tsx`, `employer/[slug]/[jobId].tsx`, `src/components/rows/JobRow.tsx` | Job application/filtering, employer reachability/status updates |
| Profile/network | `app/(app)/network.tsx`, `in/[handle].tsx`, `me/index.tsx`, `me/edit.tsx`, `me/karama/index.tsx` | Profiles/connections/Karama, M1/M2/M11 |
| Profile editor | `src/components/profile-edit/BasicsCard.tsx`, `EducationsCard.tsx`, `ExperiencesCard.tsx`, `SkillsCard.tsx`, `shared.tsx`, `styles.ts` | Shared validation, CRUD, uploads, date conversion |
| Messaging | `app/(app)/messages/index.tsx`, `messages/new.tsx`, `messages/[roomId].tsx`, `src/components/messages/useRoomThread.ts`, `thread-helpers.ts`, `src/components/rows/RoomRow.tsx` | Rooms/groups/thread/realtime/idempotency/history, M4 |
| Notifications/settings | `app/(app)/notifications.tsx`, `settings/index.tsx`, `settings/account.tsx`, `settings/blocked.tsx`, `settings/notifications.tsx`, `settings/privacy.tsx`, `settings/security.tsx`, `src/components/rows/NotificationRow.tsx`, `src/api/notifications.ts`, `src/api/safety.ts` | Preferences/export/delete/safety, M2/M7/M10 |
| Auth routes | `app/(auth)/login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password/[token].tsx`, `verify-email/[token].tsx`, `src/components/auth/AuthScaffold.tsx`, `src/lib/auth-actions.ts` | Validation/session creation/recovery/verification |
| Onboarding | `app/(app)/onboarding.tsx`, `src/components/onboarding/fields.tsx`, `helpers.ts`, `schema.ts`, `steps.tsx`, `types.ts` | Form validation, submission, media, suggestions, exception behavior |
| Shared UI/helpers | `src/components/ErrorBoundary.tsx`, `FieldCover.tsx`, `LanguageToggle.tsx`, `LoadingIntro.tsx`, `OfflineBanner.tsx`, `StateMessage.tsx`, `src/jsx.d.ts` | Error/loading/offline states, locale reachability |
| Client infrastructure | `src/lib/analytics.ts`, `api-errors.ts`, `api.ts`, `haptics.ts`, `idempotency.ts`, `linking.ts`, `locale.ts`, `observability.ts`, `profile-state.ts`, `push.ts`, `query-provider.tsx`, `session.ts`, `sse.ts`, `uploads.ts`, `src/store/network.ts`, `src/types/expo-sharing.d.ts` | Auth/session/API/SSE/push/upload/deep links/locale, M1/M5-M9 |
| Localization | `src/i18n/index.ts`, `src/i18n/ar.json`, `src/i18n/en.json` | Resource parity, locale initialization, hard-coded Karama copy |
| Unit/component tests | `src/__tests__/account-settings.test.tsx`, `api.test.ts`, `app-shell-tabs.test.tsx`, `auth-forgot-password.test.tsx`, `auth-login.test.tsx`, `auth-register.test.tsx`, `blocked-screen.test.tsx`, `feed-empty.test.tsx`, `messages-list.test.tsx`, `notifications-settings.test.tsx`, `observability.test.ts`, `onboarding-flow.test.tsx`, `profile-state.test.ts`, `search-screen.test.tsx`, `session-storage.test.ts` | What is actually asserted and missing regression cases |
| Android authored/native configuration | `android/.gitignore`, `android/app/build.gradle`, `android/app/proguard-rules.pro`, `android/app/src/debug/AndroidManifest.xml`, `android/app/src/debugOptimized/AndroidManifest.xml`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/java/ps/baydar/app/MainActivity.kt`, `MainApplication.kt`, `android/build.gradle`, `android/gradle.properties`, `android/gradle/wrapper/gradle-wrapper.properties`, `android/gradlew`, `android/gradlew.bat`, `android/settings.gradle` | Package identity, manifests, entry activity/application, native build configuration |
| Android resources/assets | `android/app/src/main/res/drawable*/splashscreen_logo.png`, `drawable/ic_launcher_background.xml`, `drawable/rn_edit_text_material.xml`, `mipmap-anydpi-v26/*.xml`, all `mipmap-*/*.webp`, `values/colors.xml`, `values-night/colors.xml`, `values/strings.xml`, `values/styles.xml`; `assets/adaptive-icon.png`, `favicon.png`, `icon.png`, `source/baydar-mark.svg`, `splash.png` | Presence/reference consistency only; no pixel-level visual audit |

## Complete retained-file manifest

The raw tree contains **3,602 files**. The manifest below contains **163 retained authored/config/native text and asset paths**. Separately, `android/app/debug.keystore` is excluded as binary signing material. Generated dependencies and outputs are excluded as listed in the next section.

```text
.env.example
.eslintrc.cjs
.gitignore
.maestro/README.md
.maestro/compose-post.yaml
.maestro/login-to-feed.yaml
.maestro/send-message.yaml
android/.gitignore
android/app/build.gradle
android/app/proguard-rules.pro
android/app/src/debug/AndroidManifest.xml
android/app/src/debugOptimized/AndroidManifest.xml
android/app/src/main/AndroidManifest.xml
android/app/src/main/java/ps/baydar/app/MainActivity.kt
android/app/src/main/java/ps/baydar/app/MainApplication.kt
android/app/src/main/res/drawable-hdpi/splashscreen_logo.png
android/app/src/main/res/drawable-mdpi/splashscreen_logo.png
android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png
android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png
android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo.png
android/app/src/main/res/drawable/ic_launcher_background.xml
android/app/src/main/res/drawable/rn_edit_text_material.xml
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
android/app/src/main/res/mipmap-hdpi/ic_launcher.webp
android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.webp
android/app/src/main/res/mipmap-hdpi/ic_launcher_round.webp
android/app/src/main/res/mipmap-mdpi/ic_launcher.webp
android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.webp
android/app/src/main/res/mipmap-mdpi/ic_launcher_round.webp
android/app/src/main/res/mipmap-xhdpi/ic_launcher.webp
android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.webp
android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp
android/app/src/main/res/mipmap-xxhdpi/ic_launcher.webp
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.webp
android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp
android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp
android/app/src/main/res/values-night/colors.xml
android/app/src/main/res/values/colors.xml
android/app/src/main/res/values/strings.xml
android/app/src/main/res/values/styles.xml
android/build.gradle
android/gradle.properties
android/gradle/wrapper/gradle-wrapper.properties
android/gradlew
android/gradlew.bat
android/settings.gradle
app.config.js
app/(app)/_layout.tsx
app/(app)/composer.tsx
app/(app)/employer/[slug]/[jobId].tsx
app/(app)/employer/[slug]/index.tsx
app/(app)/employer/index.tsx
app/(app)/feed.tsx
app/(app)/in/[handle].tsx
app/(app)/jobs/[id].tsx
app/(app)/jobs/index.tsx
app/(app)/me/edit.tsx
app/(app)/me/index.tsx
app/(app)/me/karama/index.tsx
app/(app)/messages/[roomId].tsx
app/(app)/messages/index.tsx
app/(app)/messages/new.tsx
app/(app)/network.tsx
app/(app)/notifications.tsx
app/(app)/onboarding.tsx
app/(app)/search.tsx
app/(app)/settings/account.tsx
app/(app)/settings/blocked.tsx
app/(app)/settings/index.tsx
app/(app)/settings/notifications.tsx
app/(app)/settings/privacy.tsx
app/(app)/settings/security.tsx
app/(auth)/forgot-password.tsx
app/(auth)/login.tsx
app/(auth)/register.tsx
app/(auth)/reset-password/[token].tsx
app/(auth)/verify-email/[token].tsx
app/_layout.tsx
app/index.tsx
assets/adaptive-icon.png
assets/favicon.png
assets/icon.png
assets/source/baydar-mark.svg
assets/splash.png
babel.config.js
eas.json
expo-env.d.ts
global.css
index.ts
jest-env.ts
jest-setup.ts
jest.config.js
metro.config.js
nativewind-env.d.ts
package.json
src/__tests__/account-settings.test.tsx
src/__tests__/api.test.ts
src/__tests__/app-shell-tabs.test.tsx
src/__tests__/auth-forgot-password.test.tsx
src/__tests__/auth-login.test.tsx
src/__tests__/auth-register.test.tsx
src/__tests__/blocked-screen.test.tsx
src/__tests__/feed-empty.test.tsx
src/__tests__/messages-list.test.tsx
src/__tests__/notifications-settings.test.tsx
src/__tests__/observability.test.ts
src/__tests__/onboarding-flow.test.tsx
src/__tests__/profile-state.test.ts
src/__tests__/search-screen.test.tsx
src/__tests__/session-storage.test.ts
src/api/notifications.ts
src/api/safety.ts
src/components/CommentsList.tsx
src/components/ErrorBoundary.tsx
src/components/FieldCover.tsx
src/components/LanguageToggle.tsx
src/components/LoadingIntro.tsx
src/components/OfflineBanner.tsx
src/components/StateMessage.tsx
src/components/auth/AuthScaffold.tsx
src/components/messages/thread-helpers.ts
src/components/messages/useRoomThread.ts
src/components/onboarding/fields.tsx
src/components/onboarding/helpers.ts
src/components/onboarding/schema.ts
src/components/onboarding/steps.tsx
src/components/onboarding/types.ts
src/components/profile-edit/BasicsCard.tsx
src/components/profile-edit/EducationsCard.tsx
src/components/profile-edit/ExperiencesCard.tsx
src/components/profile-edit/SkillsCard.tsx
src/components/profile-edit/shared.tsx
src/components/profile-edit/styles.ts
src/components/rows/JobRow.tsx
src/components/rows/NotificationRow.tsx
src/components/rows/PostRow.tsx
src/components/rows/RoomRow.tsx
src/i18n/ar.json
src/i18n/en.json
src/i18n/index.ts
src/jsx.d.ts
src/lib/analytics.ts
src/lib/api-errors.ts
src/lib/api.ts
src/lib/auth-actions.ts
src/lib/haptics.ts
src/lib/idempotency.ts
src/lib/linking.ts
src/lib/locale.ts
src/lib/observability.ts
src/lib/profile-state.ts
src/lib/push.ts
src/lib/query-provider.tsx
src/lib/session.ts
src/lib/sse.ts
src/lib/uploads.ts
src/store/network.ts
src/types/expo-sharing.d.ts
tailwind.config.js
tsconfig.json
```

### Explicit exclusions

The following were not treated as authored application source and are not in the 163-path manifest:

- `node_modules`, `.expo`, `.turbo`, `.gradle`, `.cxx`, `build`, `coverage`, and `dist` directories;
- Android CMake/Ninja/native build outputs, generated autolinking/codegen artifacts, compiler probes, prefab metadata, object files, and logs;
- `local.properties`, wrapper JARs, TypeScript build-info files, local keystores (`*.jks`, `*.keystore`), including the separately noted debug keystore;
- any other generated dependency/build output under those excluded directories.

These exclusions explain the difference between 3,602 raw files and the retained manifest; they are not deletion recommendations for tracked source.

## Suggested fix order

1. Preserve Karama idempotency keys across retries (M1).
2. Add normal navigation to settings and employer, then cover with navigation tests (M2/M3).
3. Implement older-message pagination (M4).
4. Restore and expose locale selection (M5).
5. Separate transient refresh errors from auth rejection; route export through fresh-token handling (M6/M7).
6. Honor post deep links and surface upload errors (M8/M9).
7. Finish low-severity pagination/localization and component splits (M10-M12).
