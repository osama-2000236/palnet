# Baydar Palestine Product Audit — API, database and contracts

## Topic and key questions

- **Assigned topic:** API, database and shared contracts in `apps/api/**`, `packages/db/**`, and `packages/shared/**`.
- **Key questions:** Are the implemented services reachable and internally consistent? Can authentication, moderation, payment, privacy, and atomicity be bypassed? Do API inputs match shared UI contracts? Which defects are confirmed, which depend on deployment, and what remains untested?
- **Method:** Source-based review of all non-generated assigned files, targeted existing tests, Prisma validation, dependency-tree and ESLint checks. No product source was changed. Generated artifacts and build output were excluded from source findings.

## Executive readout

1. **Authentication accepts deleted or suspended users.** The local and JWT guards validate credentials/token structure and expiry but do not reload user status; deleting an account also does not revoke the current access token (`apps/api/src/modules/auth/guards/jwt-auth.guard.ts:15-29`, `apps/api/src/modules/auth/strategies/jwt.strategy.ts:16-28`, `apps/api/src/modules/account/account.service.ts:30-41`). This invalidates the frontend assumption that `DeletedUserError`/`SuspendedUserError` reliably produce an audit-login dialog (`design-handoff-2026-05/code/apps/web/src/components/providers/SessionProvider.tsx:76-90`).
2. **Authentication-token changes are not atomic.** Refresh rotation validates then inserts without serializing concurrent rotations; reset/invite/verify flows validate, consume, and update the user in separate operations (`apps/api/src/modules/auth/auth-token.service.ts:73-126`). Email notifications can fail after the database commit, leaving inconsistent account state (`apps/api/src/modules/auth/auth.service.ts:126-148`).
3. **Provider cancellation is mapped to the wrong internal state.** Paddle and Stripe cancellations become `expired`, not `canceled`; Paddle past-due becomes `expired` rather than `past_due`, and Stripe checkout success writes status directly instead of using the canonical transition service (`apps/api/src/modules/billing/paddle-webhook.service.ts:198-222`, `apps/api/src/modules/billing/stripe-webhook.service.ts:73-85`, `apps/api/src/modules/billing/stripe-webhook.service.ts:136-165`).
4. **Notification email is not a reliable outbox.** A mail failure leaves the notification permanently `pending`, marks the activity read even though email was not sent, and has no later retry worker (`apps/api/src/modules/notifications/notifications.processor.ts:22-50`, `apps/api/src/modules/notifications/notifications.processor.ts:63-88`). In production `mailpit` is excluded, so a real SMTP/DKIM transport is mandatory (`docker-compose.prod.yml:111-121`).
5. **Production proxy/rate-limit defaults are unsafe unless the operator adds configuration.** The API listens on `0.0.0.0`, publishes port 3001, enables trust proxy, and does not require the client-IP secret (`apps/api/src/main.ts:28-39`, `docker-compose.prod.yml:7-26`). Global and endpoint throttlers trust forwarded addresses; an unkeyed endpoint consumes the global 300/minute allowance (`apps/api/src/common/throttle.ts:16-38`, `apps/api/src/modules/karama/karama.controller.ts:49-62`).
6. **Health/readiness can be green while auth/database are unusable.** Liveness checks only process variables, readiness does not check Postgres, and both queue checks return healthy when Redis is absent; `/health/config` publicly exposes deployment policy and flags (`apps/api/src/modules/health/health.controller.ts:24-108`).
7. **Karama balance integrity has a lock-order race.** The balance row is locked after computing the balance and before evaluating caps, rather than before reading it; sender/recipient lock order is not canonicalized, and the database `CHECK` does not bound balances (`apps/api/src/modules/karama/karama.service.ts:131-163`, `packages/db/prisma/schema.prisma:319-334`).
8. **Admin bans do not revoke sessions or existing reactions.** Moderation writes status and notification only (`apps/api/src/modules/admin-moderation/admin-moderation.service.ts:95-141`). Reaction creation checks neither actor status nor block state, while reactions can be added to a repost without any post/repost existence or status check (`apps/api/src/modules/reactions/reactions.service.ts:16-49`).
9. **There are confirmed shared-contract mismatches.** `UpdateProfileBody` still allows a `viewer` object which is sent as Prisma profile data; the connection fixture has `userId` but the shared type declares `requesterId`; social features still expose pagination props backed by a fixed 100-row first page (`packages/shared/src/schemas/profile.ts:23-28`, `apps/api/src/modules/profiles/profiles.service.ts:39-44`, `packages/db/prisma/seed-qa.ts:434-439`, `packages/shared/src/schemas/connection.ts:13-19`, `apps/api/src/modules/feed/feed.service.ts:103-107`).

## Severity legend

- **P0:** permits a deleted/suspended identity to continue authenticated actions or defeats a core security invariant.
- **P1:** high-probability integrity, payment, privacy, or production-availability defect; should block release.
- **P2:** material functional/security/reliability defect with narrower reach or a deployment precondition.
- **P3:** lower-impact inconsistency, performance problem, or maintainability risk.

## Confirmed defects and release blockers

### API-DB-01 — P0 — Deleted/suspended JWTs remain valid

**Evidence.** `AuthTokenService` explicitly rejects inactive users for refresh and one-time tokens, but `JwtStrategy.validate` returns only `{ userId, sessionId }` from a valid JWT and never reads `User.status` (`apps/api/src/modules/auth/auth-token.service.ts:96-124`, `apps/api/src/modules/auth/strategies/jwt.strategy.ts:16-28`). The account deletion handler anonymizes the user but returns success without clearing the current token (`apps/api/src/modules/account/account.controller.ts:24-29`, `apps/api/src/modules/account/account.service.ts:30-41`). Banning a user similarly updates status only (`apps/api/src/modules/admin-moderation/admin-moderation.service.ts:115-140`). The auth spec tests only that an inactive *refresh* token fails, not an inactive access token (`apps/api/src/modules/auth/auth.service.spec.ts:164-182`).

**Impact.** A captured/current access token continues to authorize requests until its normal expiry after deletion or suspension. This breaks the web provider's expected deleted/suspended login handling and the intended ban enforcement.

**Minimal remediation.** Enforce active status at the JWT guard/strategy for every protected request, or introduce server-side session revocation checked by the guard; revoke all sessions on deletion, suspension, ban, and account-status downgrade. Add integration tests that obtain a JWT, delete/suspend the user, then assert protected endpoints fail.

**Validation.** Existing unit suite passes but does not cover this access-token case; see checks below.

### API-DB-02 — P1 — Refresh rotation can fork sessions

**Evidence.** Refresh-token hashes are unique, but `rotateRefreshToken` validates the current row and then issues another token without an atomic consume/version update (`apps/api/src/modules/auth/auth-token.service.ts:73-94`, `packages/db/prisma/schema.prisma:43-64`). There is no transaction or conditional `UPDATE ... WHERE consumedAt IS NULL` around the check and insert.

**Impact.** Two concurrent requests carrying the same refresh token can both validate and create successor tokens. One-time reset/invite/verify flows have the same check-then-act gap: consuming the token and updating the user are independent writes (`apps/api/src/modules/auth/auth-token.service.ts:96-126`).

**Minimal remediation.** Use a transaction plus row lock or atomic conditional consume; rotate/revoke the whole session family on replay. For one-time tokens, consume and apply the user mutation in one serializable/locked transaction.

**Validation.** Unit tests use sequential mocked calls and therefore cannot detect the race (`apps/api/src/modules/auth/auth.service.spec.ts:123-161`).

### API-DB-03 — P1 — Post-commit email failure strands account flows

**Evidence.** Registration consumes the invite, updates the user, commits, and only then calls `sendMail`; verification, password reset, and deletion-email flows follow the same pattern (`apps/api/src/modules/auth/auth.service.ts:68-91`, `apps/api/src/modules/auth/auth.service.ts:126-148`, `apps/api/src/modules/auth/auth.service.ts:267-289`, `apps/api/src/modules/account/account.service.ts:44-57`). `sendMail` throws when SMTP is not configured (`apps/api/src/modules/mail/mail.service.ts:41-43`).

**Impact.** The user/token may be committed but the client receives an error and cannot obtain the promised email. Registration can create an active account without a verification email, and password reset can invalidate the token before the email is sent.

**Minimal remediation.** Persist an email outbox/job in the same transaction as the token mutation; process retries separately. Do not roll back a completed account mutation merely because delivery failed; return a resumable state and provide resend.

### API-DB-04 — P1 — Billing webhook state machine diverges from shared billing contract

**Evidence.** The shared state machine allows `trialing/active/past_due → canceled` and `past_due → expired` (`packages/shared/src/schemas/billing.ts:10-24`). Paddle maps `subscription.canceled` and `subscription.past_due` to `expired`; Stripe maps `customer.subscription.deleted` to `expired`; Stripe past-due has no handler at all (`apps/api/src/modules/billing/paddle-webhook.service.ts:198-222`, `apps/api/src/modules/billing/stripe-webhook.service.ts:73-85`, `apps/api/src/modules/billing/stripe-webhook.service.ts:124-132`). Stripe checkout directly writes `Subscription.status/currentPeriodEnd` rather than calling `BillingService.transition` (`apps/api/src/modules/billing/stripe-webhook.service.ts:136-165`). Paddle checkout does transition, but its subscription-created fixture uses a raw UUID as `userId` and cannot reach the intended user lookup (`apps/api/src/modules/billing/paddle-webhook.service.spec.ts:58-83`, `apps/api/src/modules/billing/paddle-webhook.service.ts:92-125`).

**Impact.** UI statuses and entitlement transitions disagree with provider reality. A canceled subscription may remain usable until period end but be labeled `expired`; a past-due Stripe subscription never enters `past_due`; direct writes bypass transition auditing and invariants.

**Minimal remediation.** Map each provider event to the canonical internal state, handle Stripe `past_due`, route all status writes through the transition service, and persist provider event IDs for idempotency. Correct the Paddle test fixture to use the actual seeded user ID.

**Validation.** Both webhook unit suites passed locally, but they mostly test status `200` and mocked side effects; no real database invariant is exercised (`apps/api/src/modules/billing/paddle-webhook.service.spec.ts:34-55`, `apps/api/src/modules/billing/stripe-webhook.service.spec.ts:38-53`).

### API-DB-05 — P1 — Notification email has no durable delivery/retry semantics

**Evidence.** Queue enqueue creates a DB notification and Bull job, but the processor sends mail first and marks `sent` only after success (`apps/api/src/modules/notifications/notifications.service.ts:39-57`, `apps/api/src/modules/notifications/notifications.processor.ts:22-50`). On failure it marks the activity read and leaves the notification `pending`; there is no scheduled retry processor (`apps/api/src/modules/notifications/notifications.processor.ts:63-88`). Bull retries depend on Redis and are disabled when Redis is absent (`apps/api/src/modules/notifications/notifications.service.ts:25-36`, `apps/api/src/modules/notifications/notifications.module.ts:14-23`).

**Impact.** SMTP downtime or a disabled queue silently loses email while in-app activity is marked read. Production compose starts no worker as a separate service, so the single API process is also the only queue consumer (`docker-compose.prod.yml:7-37`).

**Minimal remediation.** Keep notification unread until in-app delivery semantics are actually met; use a durable outbox with bounded retries and dead-letter state. Separate API and worker health/deployment if queue volume requires it.

### API-DB-06 — P1 — Account deletion retains excessive personal data and tokens

**Evidence.** Deletion clears selected profile/account fields and sets `DeletedAt`, but retains `role`, `status`, `karamaBalance`, timestamps, social graph, posts/reactions/notifications, and potentially profile fields not explicitly nulled (`apps/api/src/modules/account/account.service.ts:30-41`, `packages/db/prisma/schema.prisma:9-39`, `packages/db/prisma/schema.prisma:91-116`). No refresh/session revocation occurs, and the access-token guard remains valid as described above. The explicit foreign keys use `Cascade` for several user-owned records, but deletion is an update, not a SQL delete (`packages/db/prisma/schema.prisma:62-63`, `packages/db/prisma/schema.prisma:202-205`).

**Impact.** The feature named “delete account” is an anonymizing status update, not erasure. Retained content/social data may remain exposed through other endpoints, and existing tokens survive.

**Minimal remediation.** Define and publish the retention policy; either perform a transactional deletion/anonymization of all regulated fields and dependent content or clearly implement export/tombstone retention with access disabled. Revoke sessions immediately and test object-level access after deletion.

### API-DB-07 — P1 — Forwarded-IP controls are fail-open and one endpoint shares the global bucket

**Evidence.** `clientIp` trusts `x-baydar-client-ip` only when a secret is configured, otherwise uses the first forwarded address; `skipForwardedWhenDirect` can return `socket` (`apps/api/src/common/throttle.ts:16-38`, `apps/api/src/config/env.ts:26-31`). Global limits are 300 requests/minute per IP/user (`apps/api/src/common/common.module.ts:33-43`). Auth endpoints have dedicated buckets, but `/karama/give` has no endpoint throttle (`apps/api/src/modules/karama/karama.controller.ts:49-62`).

**Impact.** If the API is directly reachable or proxy headers are not sanitized, clients can rotate forwarded IPs to evade IP limits. Every unkeyed endpoint consumes the global 300/minute budget, enabling accidental or deliberate throttling of unrelated routes. The `/health/config` endpoint exposes whether forwarded headers are trusted, but does not enforce a safe deployment (`apps/api/src/modules/health/health.controller.ts:96-108`).

**Minimal remediation.** Bind the API privately, require sanitized proxy headers in production, fail closed on malformed/missing trusted client identity for sensitive routes, and give karama and other write endpoints independent limits. Document trusted proxy hops rather than accepting an arbitrary first `X-Forwarded-For` value.

### API-DB-08 — P1 — Production network and health defaults can expose or falsely certify the API

**Evidence.** The API listens on all interfaces (`apps/api/src/main.ts:28-31`); production publishes `API_PORT:3001` and sets `TRUST_PROXY=1` without a required client-IP secret (`docker-compose.prod.yml:7-26`). Liveness only checks `DATABASE_URL` and JWT secret presence; readiness checks migrations but not `SELECT 1`; Redis-disabled queues report healthy (`apps/api/src/modules/health/health.controller.ts:24-65`). Public `/health/config` returns provider/mail/billing/queue/flag configuration (`apps/api/src/modules/health/health.controller.ts:96-108`).

**Impact.** A host firewall or direct port exposure bypasses the intended proxy boundary. Load balancers can route traffic while Postgres is down or required mail/queue dependencies are unusable. Configuration disclosure assists targeted attacks and leaks rollout state.

**Minimal remediation.** Remove the published API port or bind it to the private interface, make production startup require explicit proxy/IP settings, add real Postgres/dependency readiness checks, and restrict detailed config to an authenticated admin/operator endpoint.

### API-DB-09 — P1 — Karama balance/cap calculation is not serialized correctly

**Evidence.** The initial transaction computes sender balance, then locks the sender row, then calculates the cap and recipient balance (`apps/api/src/modules/karama/karama.service.ts:131-163`). Monthly cap queries sum prior successful transfers in the same transaction, but the balance read precedes its row lock (`apps/api/src/modules/karama/karama.service.ts:78-90`, `apps/api/src/modules/karama/karama.service.ts:131-145`). The ledger amount has `CHECK(amount_halala > 0)`, but neither balance column has a nonnegative/overflow constraint (`packages/db/prisma/schema.prisma:319-334`, `packages/db/prisma/schema.prisma:33-35`, `packages/db/prisma/schema.prisma:105-106`). Sender and recipient locks occur in caller/recipient order, not sorted ID order (`apps/api/src/modules/karama/karama.service.ts:139-158`). Transfer calls use an interactive transaction with 15-second timeout (`apps/api/src/modules/karama/karama.service.ts:130-131`, `apps/api/src/modules/karama/karama.service.ts:184-186`).

**Impact.** Concurrent transfers can calculate from stale balances/caps and produce a negative balance or exceed the monthly cap despite application checks. Opposite-direction transfers can deadlock. A long-running interactive transaction increases lock contention.

**Minimal remediation.** Lock all affected balance rows in deterministic ID order before reading balances/caps, perform all cap and ledger writes in that transaction, and enforce nonnegative/bounded balances in SQL. Add concurrent integration tests at the real isolation level.

### API-DB-10 — P2 — Reactions permit unauthorized/deleted targets and can diverge from denormalized counts

**Evidence.** The reaction service checks actor existence only through `assertActive` in the service? The actual reaction creation path has no actor status or block check; it inserts a reaction for arbitrary `postId`/`repostId` and then increments the corresponding counter (`apps/api/src/modules/reactions/reactions.service.ts:16-49`). The foreign key to `Repost` has `onDelete: NoAction, onUpdate: NoAction`, and `Post.reactionCount` is maintained by application increments/decrements (`packages/db/prisma/schema.prisma:202-226`, `packages/db/prisma/schema.prisma:187-189`). Reactions are allowed on deleted posts/reposts unless another layer filters them; the service does not query target status.

**Impact.** Deleted/removed content can receive reactions, blocked users can interact, and a race or failed counter update can leave counts permanently inconsistent. `NoAction` also prevents straightforward repost cleanup while reactions remain.

**Minimal remediation.** Resolve and authorize the target in the same transaction, reject deleted/removed content and blocked actors, use consistent foreign-key deletion policy, and periodically reconcile denormalized counts or derive them transactionally.

### API-DB-11 — P2 — Reposts create duplicates and can retain inconsistent original/repost state

**Evidence.** The schema has no unique `(userId, originalPostId)` constraint (`packages/db/prisma/schema.prisma:246-261`). The service checks for an existing repost then inserts, without a uniqueness constraint or serializable conflict handling (`apps/api/src/modules/reposts/reposts.service.ts:16-43`). It checks the original post before insertion but does not lock it, and the repost increment occurs after the insert (`apps/api/src/modules/reposts/reposts.service.ts:21-47`). Removing a repost decrements the original count but does not verify that the original still exists before decrementing (`apps/api/src/modules/reposts/reposts.service.ts:49-65`).

**Impact.** Concurrent requests can create multiple reposts by one user, and deleted originals can produce errors or counter drift.

**Minimal remediation.** Add a database uniqueness constraint, catch duplicate-key conflicts as idempotent success/conflict, and update target/counter in one transaction with target-state validation.

### API-DB-12 — P2 — Comment reply creation has no matching read path

**Evidence.** The write schema accepts `parentId`, and the service validates/creates the parent relationship (`packages/shared/src/schemas/comment.ts:8-12`, `apps/api/src/modules/comments/comments.service.ts:30-48`). But list responses only expose the top-level comment fields and `replyCount`; the controller has only list/create/delete endpoints (`apps/api/src/modules/comments/comments.service.ts:50-72`, `apps/api/src/modules/comments/comments.controller.ts:16-31`). There is no endpoint to retrieve children of a parent.

**Impact.** The frontend `replyCount` can be nonzero while no API consumer can load replies. The comment UI contract therefore cannot be completed.

**Minimal remediation.** Add an authorized paginated `GET /comments/:id/replies`, or include nested replies in the list response; add visibility/deleted-parent tests.

### API-DB-13 — P2 — Shared profile update contract sends an object into scalar Prisma data

**Evidence.** `UpdateProfileBody` permits `viewer: UserViewPrefsSchema`, whose values include nested objects (`packages/shared/src/schemas/profile.ts:23-28`, `packages/shared/src/schemas/user-view-prefs.ts:19-25`). `ProfilesService.updateMine` passes the entire validated body as Prisma `ProfileUpdateInput` (`apps/api/src/modules/profiles/profiles.service.ts:39-44`). `Profile` has no `viewer` field (`packages/db/prisma/schema.prisma:91-116`).

**Impact.** A client using the shared schema can submit a payload that Prisma rejects at runtime. This is precisely the class of drift the shared schema is intended to prevent.

**Minimal remediation.** Remove `viewer` from the profile update body or explicitly split and persist it in its real owner table/column; add a contract test using the generated shared type against the API DTO.

### API-DB-14 — P2 — Admin moderation does not revoke compromised sessions

**Evidence.** `ban` and `suspend` update user status and insert an activity; they do not revoke `AuthToken` rows or increment a session version (`apps/api/src/modules/admin-moderation/admin-moderation.service.ts:95-141`). This remains exploitable because of API-DB-01.

**Impact.** Moderation appears successful in the admin UI while the target retains active access and refresh tokens.

**Minimal remediation.** Revoke all access/refresh sessions transactionally with moderation status changes; emit an auditable revocation event.

### API-DB-15 — P2 — Media validation and streaming have resource/security gaps

**Evidence.** Upload validation trusts the multipart MIME type, checks only extension/MIME allowlists, and has a 10 MiB global limit with a separate 5 MiB avatar check (`apps/api/src/modules/media/media.service.ts:38-44`, `apps/api/src/modules/media/media.controller.ts:24-36`, `apps/api/src/modules/media/media.service.ts:73-88`). `scanUpload` only throws “scanner not configured” when `MEDIA_SCAN_CMD` is set but cannot run; when unset it performs no scan (`apps/api/src/modules/media/media.service.ts:90-101`). The download range path buffers the entire object before slicing and does not handle malformed/multi-range requests explicitly (`apps/api/src/modules/media/media.controller.ts:63-108`, `apps/api/src/modules/media/media.controller.ts:83-86`).

**Impact.** A spoofed content type can store active content if later served incorrectly; absent malware scanning is a deployment-dependent security gap; large range requests can create avoidable memory pressure. Avatar size behavior differs from general uploads and should be reflected in the client contract.

**Minimal remediation.** Detect file signatures server-side, enforce per-kind limits before storage, make scanning mandatory for public production media or quarantine unscanned files, and stream/slice object ranges without buffering the full object. Return standards-compliant `416` for invalid ranges.

### API-DB-16 — P2 — Seed/cleanup commands can destroy data through environment confusion

**Evidence.** The destructive seed refuses only when `NODE_ENV === "production"`; otherwise it deletes all major tables (`packages/db/prisma/seed.ts:7-27`). QA seed similarly starts with cleanup and refuses only production (`packages/db/prisma/seed-qa.ts:476-502`). The package script invokes the destructive seed via `tsx` (`packages/db/package.json:15-17`). The default schema URL is a local Postgres database, but an exported `DATABASE_URL` can point elsewhere (`packages/db/prisma/schema.prisma:4-7`).

**Impact.** A developer running a routine seed with `NODE_ENV` unset but a shared/staging `DATABASE_URL` can erase that database.

**Minimal remediation.** Require an explicit destructive-seed confirmation plus a database-name/host allowlist; refuse non-local hosts by default. Make QA cleanup opt-in and separate fixture creation from deletion.

### API-DB-17 — P2 — QA fixture does not satisfy the shared connection response type

**Evidence.** The shared type requires `requesterId`, `addresseeId`, `createdAt`, `updatedAt` and `userId` is not part of the type (`packages/shared/src/schemas/connection.ts:13-19`). The QA seed's `acceptedConnection` object contains `userId`, `status`, and `createdAt` only (`packages/db/prisma/seed-qa.ts:434-439`). It is also not inserted into the shown seed operations, so consumers may be testing against an object that is neither persisted nor type-correct (`packages/db/prisma/seed-qa.ts:449-465`).

**Impact.** Contract tests can pass against fixture data while real connection responses use a different shape; intended accepted-connection coverage is absent.

**Minimal remediation.** Use the real connection fields and IDs, persist the fixture, and derive shared test data from the shared schema rather than duplicating shapes.

## Confirmed interaction and contract gaps

### API-DB-18 — P2 — Feed/social pagination is not wired to the UI pagination contract

**Evidence.** Feed/search list endpoints use `PageSchema` but services cap at 100 records and return `{ items, nextCursor }`; the feed service uses `skip: (page-1)*100`, not a cursor (`packages/shared/src/schemas/common.ts:8-11`, `apps/api/src/modules/feed/feed.service.ts:103-107`). The web handoff expects pagination props on PostCard/masonry, while the API has no page-size parameter and no total (`design-handoff-2026-05/code/apps/web/src/components/features/feed/PostCard.tsx:54-74`, `apps/api/src/modules/feed/feed.service.ts:103-107`).

**Impact.** Large feeds require arbitrary page traversal, cannot request a different page size, and expose a misleading `nextCursor` field. Deep pages become increasingly expensive.

**Minimal remediation.** Choose one contract—prefer cursor pagination with an opaque cursor and explicit limit—or implement page/limit consistently end to end. Add a contract test for the first, middle, and final pages.

### API-DB-19 — P2 — Block/mute enforcement is inconsistent across write surfaces

**Evidence.** Posts check `Block` in both directions before creation (`apps/api/src/modules/posts/posts.service.ts:55-65`); comments check both directions (`apps/api/src/modules/comments/comments.service.ts:16-28`); connections reject pending blocked requests (`apps/api/src/modules/connections/connections.service.ts:49-66`). Reactions and reposts do not perform the equivalent check (`apps/api/src/modules/reactions/reactions.service.ts:16-49`, `apps/api/src/modules/reposts/reposts.service.ts:16-43`). Feed filters blocked/muted users only for discovery/following queries, not as a universal authorization rule (`apps/api/src/modules/feed/feed.service.ts:19-33`).

**Impact.** A blocked user can still react to or repost content through direct API calls even though other interaction paths forbid it.

**Minimal remediation.** Centralize interaction authorization and invoke it for every target-based write, including reactions/reposts and replies.

### API-DB-20 — P3 — Notification fan-out is an unbounded N+1 transaction workload

**Evidence.** For each actor's connections, the service performs an individual `activity.create` inside `$transaction` and then resolves notification recipients separately (`apps/api/src/modules/notifications/notifications.service.ts:20-36`). There is no cap or batch insert.

**Impact.** A user with many connections causes a large transaction and queue workload for each post/comment/reaction, increasing latency and lock duration.

**Minimal remediation.** Use `createMany`/chunking, define a fan-out limit or asynchronous fan-out job, and avoid enqueueing duplicate work when the activity transaction fails.

### API-DB-21 — P3 — Reaction sorting depends on nullable timestamp semantics

**Evidence.** The reaction timestamp is optional in the shared response (`packages/shared/src/schemas/reaction.ts:9-14`), while Prisma defaults `createdAt` to `now()` (`packages/db/prisma/schema.prisma:217-226`). Reaction lists sort by `createdAt` in memory (`apps/api/src/modules/reactions/reactions.service.ts:51-60`). The API returns model objects directly, so the shared optional type does not enforce runtime presence.

**Impact.** Any legacy/null timestamp or malformed row can produce unstable ordering; the type suggests a guarantee the database does not express.

**Minimal remediation.** Make the response schema match the non-null database column, sort in SQL, and define a deterministic tie-breaker.

### API-DB-22 — P3 — Inbox unread count performs an extra query per request but has no cache/index evidence

**Evidence.** Inbox lists activities and then performs a separate `count` for unread rows (`apps/api/src/modules/notifications/notifications.service.ts:59-77`). The schema indexes `userId` and `readAt` separately, not a composite `(userId, readAt)` index (`packages/db/prisma/schema.prisma:274-285`).

**Impact.** Unread filtering/counting can degrade as activity history grows; the separate count also doubles round trips.

**Minimal remediation.** Add a composite index matching the unread predicate and consider a combined window/query strategy only after query-plan measurement.

## Deployment-dependent risks, not unconditional defects

- **SMTP/DKIM:** Production enables `SMTP_VERIFY_CERT=1` but does not set SMTP host/user/pass or DKIM keys in compose; the mail service falls back to a JSON transport outside production (`docker-compose.prod.yml:15-24`, `apps/api/src/modules/mail/mail.service.ts:20-52`). Verify actual environment injection and DKIM alignment before launch; do not treat the compose file as proof of working delivery.
- **Database TLS/migrations:** `DATABASE_URL` has no TLS parameters in compose (`docker-compose.prod.yml:17-18`). This may be acceptable on a private network but needs an explicit threat-model decision. Migration status is checked via `prisma migrate status`, but `prisma` is a dev dependency and production installation omits dev dependencies (`apps/api/Dockerfile:17-31`, `packages/db/package.json:24-28`). The runtime image adds a local Prisma CLI path, but this should be verified in the final image rather than assumed (`apps/api/Dockerfile:24-31`).
- **Redis semantics:** No Redis is configured in production compose, so notifications and rate-limit Redis storage are disabled; the application intentionally falls back to DB notifications and memory throttling (`docker-compose.prod.yml:15-24`, `apps/api/src/modules/notifications/notifications.module.ts:14-23`, `apps/api/src/common/common.module.ts:26-31`). Multi-replica deployments will not share memory throttle counters.
- **CORS:** `WEB_ORIGIN` is split into an allowlist, with localhost included only in development (`apps/api/src/config/env.ts:15-24`, `apps/api/src/main.ts:33-38`). Validate all deployed web origins and proxy behavior; no wildcard CORS issue was found in the shown source.
- **Media storage:** Local media is served from a process-relative `media` directory (`apps/api/src/modules/media/media.service.ts:29-36`, `apps/api/src/modules/media/media.controller.ts:38-47`). A container restart/replacement or multiple replicas can lose or partition uploads unless a persistent shared volume is mounted; production compose does not declare such a volume (`docker-compose.prod.yml:7-37`).
- **Webhook anti-replay:** Paddle verifies timestamp tolerance, Stripe delegates signature verification to the SDK (`apps/api/src/modules/billing/paddle-webhook.service.ts:58-76`, `apps/api/src/modules/billing/stripe-webhook.service.ts:45-59`). The shown DB writes are mostly idempotent by `providerCheckoutId`/user lookup, but event-level replay/idempotency storage is absent; test duplicate and out-of-order deliveries with the real provider payloads.

## Missing tests and contract coverage

The existing tests are valuable smoke tests but do not establish release safety:

- Auth specs mock Prisma and mail, so they do not test actual transaction isolation, database constraints, SMTP delivery, or current access-token validity (`apps/api/src/modules/auth/auth.service.spec.ts:25-51`).
- Billing specs mock Prisma and mostly assert successful handling; they do not assert canonical state names, provider event replay, or database writes under real constraints (`apps/api/src/modules/billing/paddle-webhook.service.spec.ts:34-55`, `apps/api/src/modules/billing/stripe-webhook.service.spec.ts:38-53`).
- The repository has integration/e2e scripts, but the inspected `apps/api/test` tree contains only `health.e2e-spec.ts` and `jest-e2e.json`; health e2e checks status/config endpoints only (`apps/api/package.json:21-23`, `apps/api/test/health.e2e-spec.ts:13-60`). No auth, billing, karama concurrency, privacy, media, or interaction integration tests were found in the assigned test tree.
- `packages/shared` has formatter specs only; no runtime schema/API contract test verifies `UpdateProfileBody` or connection fixtures against Prisma (`packages/shared/src/format.spec.ts:1-39`).
- Add automated coverage for deleted/suspended JWT access, concurrent refresh/reset, concurrent karama transfer and monthly caps, duplicate/out-of-order billing webhooks, notification retry/outbox behavior, post-delete object-level authorization, blocked reactions/reposts, reply reads, upload signature/range handling, and shared-schema DTO conformance.

## Exclusions

- `apps/api/dist/**`, `coverage/**`, `node_modules/**`, `.turbo/**`, and other build/cache output: generated or dependency material, not source of truth.
- `packages/db/prisma/migrations/**`: only migration lock was present; no SQL migration files were present to audit. The schema was treated as the source model, but migration drift should be checked with the real database.
- `packages/db/node_modules/.prisma/**` and generated Prisma clients: regenerated from schema and not hand-reviewed.
- `design-handoff-2026-05/**`: outside the assigned API/DB/shared source audit; used only to cross-check consumer assumptions and UI contract gaps.
- Lockfiles, package manager metadata, and generated API/client output: excluded except for scripts/dependency versions relevant to reproducibility.

## Coverage manifest

### `apps/api` source/configuration

Reviewed: `Dockerfile`, `jest.config.js`, `nest-cli.json`, `package.json`, `tsconfig.json`; `src/main.ts`, `src/app.module.ts`; `src/config/env.ts`; `src/common/common.module.ts`, `constants.ts`, `pagination.ts`, `prisma.service.ts`, `prisma.module.ts`, `redis.service.ts`, `request-user.ts`, `throttle.ts`, `decorators/public.decorator.ts`, `filters/http-exception.filter.ts`; all controllers/services/modules/DTOs/specs in `account`, `admin-moderation`, `auth` (including guards/strategies/token/mail/invites/verification), `billing` (including Paddle/Stripe webhook services/specs), `comments`, `connections`, `feed`, `follows`, `health`, `karama`, `mail`, `media`, `notifications`, `posts`, `profiles`, `reactions`, `reports`, `reposts`, `safety`, `search`, and `users`; `test/health.e2e-spec.ts` and `test/jest-e2e.json`.

### `packages/db`

Reviewed: `package.json`, `scripts/db-generate.mjs`, `scripts/db-migrate.mjs`, `prisma/schema.prisma`, `prisma/migrations/migration_lock.toml`, `prisma/seed.ts`, `prisma/seed-qa.ts`, and `prisma/cleanup-qa.ts`.

### `packages/shared`

Reviewed: `package.json`, `tsconfig.json`, `src/index.ts`, `src/format.ts`, `src/format.spec.ts`, and every schema in `src/schemas/`: `account.ts`, `activity.ts`, `admin.ts`, `auth.ts`, `autolink.ts`, `billing.ts`, `comment.ts`, `common.ts`, `connection.ts`, `conversation.ts`, `feed.ts`, `follow.ts`, `invitation.ts`, `karama.ts`, `media.ts`, `message.ts`, `moderation.ts`, `notification.ts`, `page-info.ts`, `post.ts`, `profile.ts`, `reaction.ts`, `report.ts`, `repost.ts`, `search.ts`, `user-view-prefs.ts`, `user.ts`.

## Validation performed

All commands were read-only with respect to product source and ran with the existing dependency tree:

- `pnpm --filter @baydar/api exec jest --config jest.config.js --runInBand`: **27 suites, 274 tests passed**; existing coverage warnings remained.
- `pnpm --filter @baydar/api exec jest --config test/jest-e2e.json --runInBand`: **1 suite, 3 tests passed**.
- `pnpm --filter @baydar/shared exec jest --runInBand`: **1 suite, 14 tests passed**.
- `pnpm --filter @baydar/db exec prisma validate --schema prisma/schema.prisma`: **schema valid**.
- `pnpm --filter @baydar/api exec tsc --noEmit -p tsconfig.json`: failed because the current dependency tree lacks `@nestjs/config`, `@nestjs/event-emitter`, `@nestjs/schedule`, and related type declarations (`apps/api/src/app.module.ts:3-5`, `apps/api/src/config/env.ts:1`, `apps/api/src/modules/media/media.service.ts:3`).
- `pnpm --filter @baydar/api exec eslint "src/**/*.ts" "test/**/*.ts"`: could not run because the installed ESLint is v10 while the repo config is legacy `.eslintrc.js`; use the repo-pinned ESLint/config in CI.
- `pnpm --filter @baydar/api run test:cov`: **27 suites, 274 tests passed**, with low global branch coverage (29.09%) and especially low coverage in billing/karama/notifications/media paths; the command exited successfully because no coverage threshold is configured (`apps/api/jest.config.js:7-17`).

The passing unit/e2e suites therefore confirm the tested happy paths, not the security and concurrency blockers above. Release should remain blocked until API-DB-01 through API-DB-09 have targeted integration coverage and the billing state mappings have been corrected.
