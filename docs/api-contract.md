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
- `POST /auth/stream-token` is protected and accepts `{ scope: "messaging" | "notifications" }`. It returns `{ data: { token, expiresAt } }`.

Email verification and password reset tokens are opaque 64-character client tokens. The API stores only SHA-256 token hashes, applies expiry and single-use consumption, and never returns raw tokens in API responses.

SSE stream tokens are opaque, SHA-256 hashed at rest, scoped to one stream, expire within 60 seconds, and are consumed exactly once. Browser clients that cannot set EventSource headers call `/auth/stream-token`, then open `/messaging/stream?token=<token>` or `/notifications/stream?token=<token>`. Mobile clients may keep using `Authorization: Bearer <accessToken>` for SSE because their EventSource implementation supports headers. `?access_token=` is not accepted.

Login for a soft-deleted account returns `403`. Within the 30-day restore grace period the error code is `ACCOUNT_DELETED_PENDING_RESTORE` and includes `{ restorePath: "/account/restore" }` details; after grace the code is `ACCOUNT_DELETED`.

### Account

- `POST /account/delete`
- `GET /account/export`
- `POST /account/restore`

`POST /account/delete` is protected and accepts `{ confirmation: "DELETE_MY_ACCOUNT" }`. It soft-deletes the user with `deletedAt`, snapshots original email/profile PII in `User.pendingDeletionSnapshot`, anonymizes email/profile display fields, revokes active refresh tokens, and returns `204 No Content`.

`GET /account/export` is protected and returns a synchronous JSON export envelope with `Content-Disposition: attachment; filename="baydar-export-<userId>.json"`. The v1 envelope contains profile, posts, comments, reactions, reposts, chat-room memberships, messages, notifications, blocks, and reports.

`POST /account/restore` is public and accepts `{ email, password, deviceId? }`. It verifies the original email against the pending deletion snapshot and the password against the still-present password hash. Restore is allowed only within 30 days of `deletedAt`; success clears `deletedAt`, restores profile/email fields, clears the snapshot, and returns `{ data: AuthSession }`.

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

Presign requests are rejected before signing unless MIME type, declared kind, and size fit this allowlist:

| MIME type         | Kind       | Max size |
| ----------------- | ---------- | -------- |
| `image/jpeg`      | `IMAGE`    | 10 MB    |
| `image/png`       | `IMAGE`    | 10 MB    |
| `image/webp`      | `IMAGE`    | 10 MB    |
| `image/gif`       | `IMAGE`    | 10 MB    |
| `application/pdf` | `DOCUMENT` | 25 MB    |
| `video/mp4`       | `VIDEO`    | 100 MB   |

Rejected MIME/kind combinations return `400 MEDIA_TYPE_REJECTED`; oversize files return `400 MEDIA_SIZE_REJECTED`.

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

Browser flow: call `POST /auth/stream-token` with `{ scope: "messaging" }`, then connect with `GET /messaging/stream?token=<one-time-token>`.

### Notifications

- `GET /notifications`
- `GET /notifications/unread-count`
- `POST /notifications/read`
- `POST /notifications/devices`
- `GET /notifications/stream`

The notification stream sends authenticated in-app notification events. Push fanout is best-effort via Expo for registered devices.

Browser flow: call `POST /auth/stream-token` with `{ scope: "notifications" }`, then connect with `GET /notifications/stream?token=<one-time-token>`.

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

## Rate Limits

Route-level rate limits are per authenticated user. Related endpoints share the same bucket when listed together.

| Class                | Routes                                                        | Limit                 |
| -------------------- | ------------------------------------------------------------- | --------------------- |
| Media presign        | `POST /media/presign`                                         | 30/hour/user          |
| Search               | `GET /search/people`, `GET /search/posts`, `GET /search/jobs` | 60/min/user combined  |
| Content create       | `POST /posts`, `POST /posts/:id/comments`                     | 30/hour/user combined |
| Messaging send       | `POST /messaging/rooms/:id/messages`                          | 120/min/user          |
| Push device register | `POST /notifications/devices`                                 | 10/hour/user          |
| Safety action        | `POST /reports`, `POST /blocks`                               | 30/hour/user combined |

Over-limit responses use `429` with `error.code = "RATE_LIMITED"` and a `Retry-After` header.

## Security Invariants

- Never return password hashes, refresh token hashes, or private email addresses to non-owners.
- Validate every controller boundary with shared schemas or equivalent Zod validation.
- Keep auth, ownership, suspension, and role checks in guards/services, not UI-only logic.
- Do not expose access tokens in query strings; browser SSE uses one-time stream tokens and mobile SSE sends bearer headers.
- Production CORS must name allowed origins explicitly. `*` and missing origins are boot-time failures.
