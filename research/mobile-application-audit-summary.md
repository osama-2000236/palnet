# Mobile application audit — request status

Date: 2026-11-13  
Method: static review of the current, dirty `apps/mobile` worktree, with web/shared comparisons where useful. No device, emulator, live API, push provider, or file-sharing runtime was exercised.  
Detailed findings, evidence, manifest, and fix order: [`mobile-application-audit.md`](./mobile-application-audit.md).

## Requests 1–10

### 1. Highest-priority mobile defects

**Confirmed.** Karama creates a fresh idempotency key inside each redemption call, so a retry after a lost response can repeat the operation (`app/(app)/me/karama/index.tsx:48-59`). Message threads retain only the latest 30 messages and discard the older-page cursor (`src/components/messages/useRoomThread.ts:64-79`). Settings and employer routes also lack normal entry points. These are findings M1–M4 in the detailed report.

### 2. Avatar/member controls

**Conditionally confirmed; not a general direct-message defect.** `RoomRow` and `MessageThread` fall back to the other member's name/avatar and can offer block/report for non-group rooms. The journey fails when `ParticipantSummary` is present but `participant` is null and `participantId` is not the viewer: `thread-helpers.ts` cannot derive a name or target ID, so `getRoomActions` returns no destructive action. See the P1 conditional finding below.

### 3. Email verification and locale after verification

**Partially covered.** `ar.json` and `en.json` both define verification copy, and `app/(auth)/verify-email/[token].tsx` exists. However, no normal mobile navigation leads to that screen, login API errors are only rendered as localized messages, and there is no email-change/reverification journey. Existing notification preferences are a different API and must not be treated as email verification settings.

### 4. Notification preferences

**Implemented but unreachable through ordinary navigation.** The settings screen loads/saves `/me/notification-preferences`, displays errors, and maintains dirty/pristine state. The settings hub links exist only inside `settings/index.tsx`; `me/index.tsx` links directly to blocked users and account but not the hub or notification preferences.

### 5. Arabic localization

**Partial.** Settings labels/reasons use locale resources, but the Karama balance, rewards, redemption controls, ledger reasons, and Profile button are hard-coded English. Composer also submits `language: "ar"` unconditionally rather than using the active locale (`app/(app)/composer.tsx:96-100`).

### 6. Language selector and preference restore

**Not functional end to end.** `LanguageToggle.tsx` has no importer. `loadStoredAppLocale` is exported but never called, while native startup chooses the device locale. Consequently no UI changes the preference and a programmatically stored preference is not restored on restart.

### 7. Direct-chat recipient selection

**No confirmed request/ID defect.** New-room recipient IDs come from connection records, and `createRoomBody` validates the submitted schema. Existing direct rooms reuse the API-returned room ID. No client-side chat-request redesign is indicated by this code.

### 8. Loading older messages

**Confirmed missing.** The thread requests `messages?limit=30`, reverses that response, and does not retain `nextCursor`/`hasMore`; the screen exposes no load-older callback. Web retains cursor state and prepends older messages.

### 9. Attachment formats and upload failure

**Two separate issues.** Native `AttachmentPicker` advertises all files but has no web file-dialog implementation, so it is not a working arbitrary-format path. Composer image upload is the primary mobile path; its presign/read/PUT block has `try/finally` but no `catch`, leaving failures outside the composer's localized error state.

### 10. Post/message sharing

**Deletion candidate, not implemented mobile sharing.** No mobile share-target extension, Android share intent receiver, incoming text/URL handler, or composer prefill-from-share flow was found. Web's share button and mobile account-export file sharing do not implement this request.

## Requests 11–20

### 11. Messaging limited to direct rooms

**Confirmed.** `MessageThread` passes only `isPrivate` to `getRoomActions`; there is no group-only membership/admin action branch. The current composer creates groups, but the thread lacks explicit group-management parity.

### 12. Message-type and composer progress localization

**No defect confirmed.** Unknown message types and sending/uploading labels use translation keys in both locale resources. No remaining hard-coded progress string was identified in the current composer path.

### 13. Login 400 and session handling

**No static 400-causing payload identified.** Auth actions send the shared body-token envelope and validate the response. A different confirmed defect exists: every refresh failure, including network/server failure, clears the session and redirects to login (`src/lib/api.ts:152-166`). Only definitive credential rejection should do that.

### 14. Generic API errors

**Confirmed as a UX limitation.** `apiErrorMessage` translates only an error code and otherwise returns `common.genericError`; it does not surface a server's descriptive message. Screens therefore cannot reliably distinguish server validation/conflict/network causes even though `ApiRequestError` retains status/code.

### 15. Preference rollback, loading failure, and save errors

**Mostly implemented.** Saving has API error handling, revert restores the pristine object, and initial loading failure displays a retry state (`settings/notifications.tsx:56-86,150-161`). Save errors remain code-based/generic as described above. The confirmed blocker is reachability, not missing rollback state.

### 16. Verified-email state after email change

**Journey absent.** Current account settings provide export/delete only; no email-change form, verification-status display, or reverification call was found. This is distinct from notification preferences.

### 17. Account deletion diagnostics and side effects

**No defect confirmed in current code.** `settings/account.tsx` posts exactly `{ confirmation: "DELETE_MY_ACCOUNT" }` to `/account/delete`, clears the local session only after success, and routes to login. No state dump or debug side effect was found.

### 18. New files and deletion safety

**No unconditional deletion supported.** Expo route files can be reachable despite hidden tabs. The unused language selector and disabled privacy/security placeholders are conditional candidates only, depending on product scope. The manifest and exclusions are verified below.

### 19. Authentication and onboarding screens

**Core screens exist.** Login, registration, forgot/reset password, verification, and onboarding routes are present. Registration reaches onboarding. The remaining source-confirmed auth gap is the lack of an in-app path to email verification; runtime onboarding/API behavior remains unverified.

### 20. Attachment selection and errors

**Duplicate of request 9.** Keep one remediation item: implement/support the intended native picker formats and catch composer upload failures. No arbitrary-document upload should be claimed from the current native picker.

## Requests 21–30

### 21. Unused/deleted files and remaining candidates

**No unconditional source deletion is justified.** Do not delete hidden routes solely because `_layout.tsx` sets `href: null`; push/deep-link navigation still uses them. `LanguageToggle.tsx` should first be wired for the language request. Privacy/security screens are placeholders and can be removed only if that product scope is rejected.

### 22. Post composition

**Partially covered.** Text uses shared `CreatePostBody`, media metadata is collected, posting handles API errors, and the busy state prevents normal duplicate submission. Attachment failures bypass `setError`; locale is hard-coded to Arabic. Full text/media upload behavior still needs device/API validation.

### 23. Account security

**Partially covered.** Delete confirmation and logout are implemented. No current-password/old-password verification or email-change security flow exists. Export uses the raw stored access token with global `fetch`, bypassing fresh-token acquisition and the shared authenticated retry path.

### 24. Composer text validation and payload shape

**Core contract present.** `CreatePostBody.safeParse` validates body/language/media before `POST /posts`; submission uses the parsed payload. The hard-coded language and uncaught attachment path are the remaining source issues, not an absent text schema.

### 25. Preference loading, revert, and persistence

**Implemented statically.** GET/PATCH use the shared preferences schema and endpoint; a pristine copy supports Revert and dirty detection. Loading failure has a retry state. Navigation must expose this working screen before calling the journey complete.

### 26. Direct-chat ID and payload validation

**Covered statically.** Shared room-creation schemas validate the request and the selected recipient is taken from accepted connection data. No alternative client endpoint or ad hoc ID construction was found.

### 27. Message retry identity

**Correct.** `useRoomThread` creates the client ID once for an optimistic message and reuses it on retry; reconciliation accepts server ID or client ID. This differs from the Karama retry defect and should not be reported as broken.

### 28. Map/navigation shortcuts

**Present but incomplete.** Top-tab shortcuts exist, and deep-link parsing handles profile/post/message/job/verify/reset paths. Employer/settings screens are hidden without another entry. Post deep links pass `postId` to a feed that never reads it, so the requested post is not focused or fetched.

### 29. Web share action on mobile

**Not implemented.** There is no incoming share-target/intent path or mobile equivalent of the web share composer prefill. Delete the unused web-only expectation only if mobile sharing is explicitly out of scope; otherwise implement a real native share flow.

### 30. Missing screens and authored-file manifest

**Screen files are present, but presence is not reachability.** The detailed report's manifest contains **163 unique retained paths**, all exist, and there are zero unlisted retained files under its exclusions. Its raw-tree total is **3,602 files**. Generated dependencies/build outputs and local signing material are excluded as documented.

## Additional source-confirmed findings

These close gaps in the requested checks without duplicating the items above.

### Security and account

- **P1, conditional — missing direct-message target blocks block/report.** `packages/shared/src/schemas/messaging.ts` permits `ParticipantSummary.participant` to be null while `participantId` is also nullable. `apps/mobile/src/components/messages/thread-helpers.ts:7-27,66-100` derives the DM peer only from `participant` or by excluding `viewerId`; when neither yields a peer, `getRoomActions` returns `[]`. With a fallback peer ID, `MessageThread.tsx:135-193` and `getRoomActions` already expose Block and Report for non-group rooms. Add a regression fixture for summary-only/missing-participant responses; do not infer a current server response shape without an API check.
- **P2 — composer attachment errors bypass localized state.** `app/(app)/composer.tsx:54-92` catches neither upload nor picker/token failures. Add `catch` handling that calls `setError(apiErrorMessage(t, error))` (with suitable non-API fallback) and retain the existing `finally` cleanup.
- **P2 — export skips token freshness.** `settings/account.tsx:24-49` uses `getAccessToken` plus global `fetch`. Use the shared fresh-token/auth-retry policy without JSON-schema parsing the export body.
- **P3 — English-only Karama.** `me/karama/index.tsx` and the Profile Karama button hard-code user-facing English despite Arabic being the default.

### Interaction and reachability

- **No direct-message empty-shell claim.** The screen has a back button and its message body fills the available area. A generic delete-everything recommendation is therefore unsupported.
- **No fake composer share flow is wired.** The composer is a genuine post-creation screen, not an incoming share-target implementation; those are separate requirements.
- **Native arbitrary-file selection is not demonstrated.** `AttachmentPicker.native.tsx` uses the native document picker, while `AttachmentPicker.tsx` contains the web file input. Validate supported formats on each platform instead of treating the shared component as proof.
- **No fabricated successful share/export.** Account export checks HTTP success and sharing availability; its confirmed problem is token freshness, not unconditional success reporting.

### Messaging and parity

- **Unread display is consistent enough for the observed shape.** The three unread room summaries each have a badge/row treatment. Older-message pagination remains the substantive messaging defect.
- **Group-only behavior is limited, not wholly absent.** Current new-message flow creates groups; the missing part is explicit thread-side group action handling beyond `isPrivate`.
- **Do not claim all message text is English.** Arabic and English resources contain message-type and sending strings; Karama is the clear hard-coded localization outlier.

### Validation and delivery risks

- **Not runtime-confirmed:** native rendering/layout, RTL restart behavior, route behavior on device, actual API error bodies/statuses, SSE/push delivery, picker/share UI, and EAS builds.
- **Static coverage does not close those risks.** Existing tests and three Maestro flows do not establish the missing settings/employer/deep-link/older-message behaviors.
- **Highest-value regression tests:** refresh network-vs-401 behavior; Karama retry-key reuse; older-message prepend/dedupe/scroll anchor; settings/employer reachability; requested-post deep link; locale restore; export token refresh; composer upload rejection; summary-only DM block/report.

## Fix order

1. Karama retry identity, settings/employer navigation, and older-message pagination (M1–M4).
2. Locale mounting/restore and transient-refresh logout (M5/M6).
3. Post deep-link target, export freshness, and composer upload errors (M7–M9).
4. Conditional DM peer fallback, Arabic Karama copy, and remaining platform validation.

No source files outside these two audit documents were changed by this summary audit; no commits or pushes were performed.
