# API Contract

Base path: `/api/v1`. Swagger is available at `/api/docs`. Request and response contracts are backed by Zod schemas in `packages/shared/src/schemas`.

## Conventions

- Protected routes use `Authorization: Bearer <accessToken>`.
- Refresh is handled by `/auth/refresh` with a stored refresh token.
- Success response envelopes are route-specific. Wrapped routes use `{ data, meta? }`; raw DTO exceptions are listed in [Response Envelopes](#response-envelopes).
- Errors use `{ error: { code, message, details? } }`.
- Cursor pagination uses `after` and `limit` with `{ nextCursor, hasMore, limit }` metadata.
- Live app updates use SSE streams from the API, not legacy socket namespaces.
- Timestamps are ISO 8601 UTC strings.

## Response Envelopes

Default policy for new REST routes: return `{ data, meta? }`, with `meta` reserved for pagination or transport metadata. Sprint 13 keeps the current shipped raw DTO routes stable instead of wrapping them in a breaking API sweep.

Current raw response exceptions:

- `GET /health` returns a health object.
- `POST /auth/logout`, delete routes, reaction/repost toggles, and messaging read/archive/typing routes return `204 No Content`.
- `DELETE /blocks/:blockedUserId` returns `204 No Content`.
- Messaging detail/action routes return raw DTOs: `POST /messaging/rooms`, `GET /messaging/rooms/:id`, `POST /messaging/rooms/:id/messages`, `PATCH /messaging/messages/:id`, and `DELETE /messaging/messages/:id`.
- Job detail/action routes return raw DTOs: `GET /jobs/:id` returns a `Job`; `POST /jobs/:id/apply` returns `{ id, status }`.
- Notification counters/actions return raw count DTOs: `GET /notifications/unread-count` and `POST /notifications/read` return `{ count }`.
- SSE routes stream event frames and do not use JSON response envelopes.

All other JSON success responses should use `{ data, meta? }` unless a future decision record adds a raw exception.

## Core Endpoints

### Health

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/verify-email/send` returns `202 Accepted` with no body. The response is enumeration-safe.
- `POST /auth/verify-email/confirm` returns `{ data: { emailVerified: true } }`.
- `POST /auth/forgot-password` returns `202 Accepted` with no body. The response is enumeration-safe.
- `POST /auth/reset-password` returns `{ data: { reset: true } }`.

Email verification and password reset tokens are opaque 64-character client tokens. The API stores only SHA-256 token hashes, applies expiry and single-use consumption, and never returns raw tokens in API responses.

### Profiles

- `POST /profiles/onboard`
- `GET /profiles/:handle`
- `PATCH /profiles/me`

### Connections

- `GET /connections`
- `GET /connections/requests`
- `GET /connections/suggestions`
- `POST /connections`
- `POST /connections/:id/respond`
- `DELETE /connections/:id`

### Feed, Posts, And Interactions

- `GET /feed`
- `POST /posts`
- `GET /posts/:id`
- `PATCH /posts/:id`
- `DELETE /posts/:id`
- `PUT /posts/:id/reaction`
- `DELETE /posts/:id/reaction`
- `GET /posts/:id/comments`
- `POST /posts/:id/comments`
- `DELETE /comments/:id`
- `POST /posts/:id/reposts`
- `DELETE /posts/:id/reposts`

### Media

- `POST /media/presign`

Returns signed upload data and media metadata. Current blurhash support is a deterministic API placeholder, not image-byte decoding.

### Safety

- `POST /reports`
- `POST /blocks`
- `DELETE /blocks/:blockedUserId`
- `GET /blocks`

Safety routes are protected and use shared Zod schemas from `packages/shared/src/schemas/safety.ts`.

`POST /reports` accepts `{ reason, details?, targetUserId?, targetPostId?, targetCommentId?, targetMessageId? }`; at least one target is required. Reporting yourself, including your own post/comment/message target, returns `400`.

`POST /blocks` accepts `{ blockedUserId }` and is idempotent. Re-blocking the same user returns the existing block in `{ data }`.

`DELETE /blocks/:blockedUserId` is idempotent and returns `204` even when no block row exists.

`GET /blocks` uses cursor pagination and returns `{ data: BlockedUserDTO[], meta }`.

Blocking is bidirectional for visibility: feed, people search, comments, post activity counts, direct-message room listing, group-room message visibility, and notification creation/listing exclude users who either blocked the viewer or were blocked by the viewer. Sending a message into a room with any blocked relationship returns `403` with `error.code = "BLOCKED"`.

### Messaging

- `GET /messaging/rooms`
- `POST /messaging/rooms`
- `GET /messaging/rooms/:id`
- `GET /messaging/rooms/:id/messages`
- `POST /messaging/rooms/:id/messages`
- `PATCH /messaging/messages/:id`
- `DELETE /messaging/messages/:id`
- `POST /messaging/rooms/:id/read`
- `POST /messaging/rooms/:id/archive`
- `POST /messaging/rooms/:id/typing`

### Live Messaging

- `GET /messaging/stream`

The stream sends events such as new messages, read state, typing state, and room updates for the authenticated user.

### Notifications

- `GET /notifications`
- `GET /notifications/unread-count`
- `POST /notifications/read`
- `POST /notifications/devices`
- `GET /notifications/stream`

The notification stream sends authenticated in-app notification events. Push fanout is best-effort via Expo for registered devices.

### Jobs And Applications

- `GET /jobs`
- `GET /jobs/:id`
- `POST /jobs/:id/apply`

The current shipped UI supports job listing, detail, filters, optimistic apply, and optional cover letter. Company-admin endpoints are planned but should be confirmed against implementation before use.

### Search

- `GET /search/people?q=&after=&limit=` returns `{ data: SearchPersonHit[], meta }`.
- `GET /search/posts?q=&after=&limit=` returns `{ data: SearchPostHit[], meta }` and excludes posts from users in either direction of a block relationship.
- `GET /search/jobs?q=&after=&limit=` returns `{ data: SearchJobHit[], meta }` and only includes active, unexpired jobs.

`/search/companies` is deferred until the company admin/management surface ships.

## Security Invariants

- Never return password hashes, refresh token hashes, or private email addresses to non-owners.
- Validate every controller boundary with shared schemas or equivalent Zod validation.
- Keep auth, ownership, suspension, and role checks in guards/services, not UI-only logic.
- Do not expose access tokens in query strings; mobile SSE sends bearer headers.
