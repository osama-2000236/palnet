# API Contract

Base path: `/api/v1`. Swagger at `/api/docs`. All request/response bodies are Zod-inferred from [`packages/shared`](../packages/shared/src/schemas/).

## Conventions

- **Success:** `200`/`201` with `{ data: T, meta?: object }`.
- **Error:** `4xx`/`5xx` with `{ error: { code: ErrorCode, message: string, details?: unknown } }`.
- **Auth:** `Authorization: Bearer <accessToken>` on protected routes. Missing/expired → `401 AUTH_TOKEN_INVALID` or `AUTH_TOKEN_EXPIRED`.
- **Pagination:** `?after=<cursorId>&limit=<20>` returning `{ data, meta: { nextCursor, hasMore, limit } }`. Offset pagination is banned.
- **Idempotency:** Mutating endpoints that can retry (send message, apply to job, upload media) accept `Idempotency-Key` header or a client-provided id in the body (`clientMessageId`).
- **Locale:** `Accept-Language: ar-PS,en;q=0.5` expected. Server echoes chosen locale in `Content-Language`.

## Endpoint Catalogue

### Health

- `GET /health` → `{ status: "ok", uptime, version }`

### Auth (public unless noted)

- `POST /auth/register` — `RegisterBody` → `AuthSession`
- `POST /auth/login` — `LoginBody` → `AuthSession`
- `POST /auth/refresh` — `RefreshBody` → `AuthTokens`
- `POST /auth/logout` (auth) — revokes current refresh token
- `GET /auth/me` (auth) → `PrivateUser`
- `GET /auth/google` — OAuth redirect (Sprint 1.5)
- `GET /auth/google/callback` — OAuth callback (Sprint 1.5)

### Profiles

- `POST /profiles/onboard` (auth) — `OnboardProfileBody` → `Profile`
- `GET /profiles/:handle` — public `Profile`
- `PATCH /profiles/me` (auth) — `UpdateProfileBody` → `Profile`
- `POST /profiles/me/experiences` (auth) — `Experience` → `Experience`
- `PATCH /profiles/me/experiences/:id` (auth) — partial `Experience`
- `DELETE /profiles/me/experiences/:id` (auth)
- `POST /profiles/me/educations` (auth) — `Education` → `Education`
- `PATCH /profiles/me/educations/:id` (auth)
- `DELETE /profiles/me/educations/:id` (auth)
- `POST /profiles/me/skills` (auth) — `{ name }` → `Skill`
- `DELETE /profiles/me/skills/:id` (auth)

### Connections

- `POST /connections` (auth) — `SendConnectionBody` → `Connection`
- `POST /connections/:id/respond` (auth) — `RespondConnectionBody` → `Connection`
- `DELETE /connections/:id` (auth) — withdraw (requester) or remove (both)
- `GET /connections` (auth, cursor) — my accepted connections
- `GET /connections/requests` (auth, cursor) — incoming pending
- `GET /users/:handle/connections` (cursor) — public network list
- `POST /users/:id/block` (auth)
- `DELETE /users/:id/block` (auth)

### Posts & Feed

- `POST /posts` (auth) — `CreatePostBody` → `Post`
- `GET /feed` (auth, cursor) — chronological feed (self + connections + followed companies)
- `GET /posts/:id` — `Post` (respects blocks)
- `PATCH /posts/:id` (auth, owner) — `UpdatePostBody`
- `DELETE /posts/:id` (auth, owner) — soft delete

### Reactions / Comments / Reposts

- `PUT /posts/:id/reaction` (auth) — `SetReactionBody` → `{ counts }`
- `DELETE /posts/:id/reaction` (auth)
- `POST /posts/:id/comments` (auth) — `CreateCommentBody` → `Comment`
- `GET /posts/:id/comments` (cursor) — top-level + 1 level replies
- `DELETE /comments/:id` (auth, owner or moderator)
- `POST /posts/:id/reposts` (auth) — `CreateRepostBody` → `{ id }`
- `DELETE /posts/:id/reposts` (auth)

### Media

- `POST /media/upload-url` (auth) — `{ kind, mimeType, sizeBytes }` → `{ uploadUrl, publicUrl, key, expiresAt }`

### Messaging

- `POST /chat/rooms/dm` (auth) — `CreateOrGetDmBody` → `ChatRoom`
- `GET /chat/rooms` (auth, cursor) — `ChatRoom[]` ordered by `updatedAt desc`
- `GET /chat/rooms/:id/messages` (auth, cursor) — `Message[]` newest first
- `POST /chat/rooms/:id/messages` (auth, idempotent) — `SendMessageBody` → `Message`
- `POST /chat/rooms/:id/read` (auth) — sets `lastReadAt = now()`

### Messaging SSE — `/messaging/stream`

- Browser clients connect with `EventSource` using `?access_token=<accessToken>` because SSE cannot set custom auth headers.
- Server → client events:
  - `message.new` (payload `Message`)
  - `message.read` (payload `{ roomId, userId, at }`)
- Typing remains best-effort client state for beta; no bidirectional socket channel is shipped in this phase.

### Notifications

- `GET /notifications` (auth, cursor)
- `GET /notifications/unread-count` (auth)
- `POST /notifications/read` (auth) — `MarkNotificationsReadBody`
- SSE stream `/notifications/stream`:
  - Server → client: `notification.new` (payload `Notification`)
  - Server → client: `notification.read` (payload `{ ids, at }`)
  - Server → client: `notification.unread-count` (payload `{ count }`)

### Companies

- `GET /companies/mine` (auth) — companies the viewer can manage
- `POST /companies` (auth) — `CreateCompanyBody` → `Company`
- `GET /companies/:slug` — `Company` + counts
- `PATCH /companies/:id` (auth, company admin) — `UpdateCompanyBody`
- `POST /companies/:id/members` (auth, company admin) — `AddCompanyMemberBody`
- `DELETE /companies/:id/members/:userId` (auth, company admin)

### Jobs

- `GET /jobs` (cursor, `JobSearchQuery` query) — search
- `GET /jobs/:id` — `Job`
- `POST /companies/:id/jobs` (auth, company admin) — `CreateJobBody` → `Job`
- `PATCH /jobs/:id` (auth, company admin) — `UpdateJobBody`
- `DELETE /jobs/:id` (auth, company admin) — soft delete / close

### Applications

- `POST /jobs/:id/apply` (auth) — `ApplyToJobBody` → `{ id, status }`
- `GET /me/applications` (auth, cursor)
- `GET /companies/:id/jobs/:jobId/applications` (auth, company admin, cursor)
- `PATCH /applications/:id/status` (auth, company admin) — `UpdateApplicationStatusBody`

### Search

- `GET /search/people?q=...` (cursor)
- `GET /search/posts?q=...` (cursor)
- `GET /search/jobs?q=...` (alias of `/jobs`)
- `GET /search/companies?q=...`

### Moderation

- `POST /reports` (auth, throttled) — `CreateReportBody { targetKind, targetId, reason, details? }` → `ReportAck`
- `POST /blocks` (auth, throttled) — `BlockUserBody { userId }` → `204`
- `DELETE /blocks/:userId` (auth) — unblock by blocked user id → `204`
- `GET /blocks` (auth) — `BlockedUserList`
- `GET /admin/reports?status=open|resolved|all&targetKind=&reason=&reporter=&resolver=&createdFrom=&createdTo=&resolvedFrom=&resolvedTo=&after=&limit=` (moderator/admin) — `AdminReportPage`
- `GET /admin/reports/export.csv?...same filters...` (moderator/admin) — CSV audit export
- `GET /admin/reports/:id` (moderator/admin) — `AdminReportItem`
- `POST /admin/reports/:id/resolve` (moderator/admin) — `ResolveReportBody { note? }` → `AdminReportItem`

Admin moderation is audit-only. Resolve records `resolvedAt`, optional `resolvedNote`, and `resolvedBy`; it does not suspend users, delete content, or apply automated actions. Missing/deleted targets stay visible with an `"unavailable"` preview.

## Response Shape Invariants

- **Never return `passwordHash`, `refreshTokenHash`, raw emails of non-owners.** Strip in the service, not the controller.
- **Timestamps**: always ISO 8601 UTC strings.
- **IDs**: always cuid strings.
- **Currency**: integer minor units _not_ used — salaries stored as whole units in the currency. Document in the field name (`salaryMin` is whole ILS).
- **Nullability**: explicit `null`, never omitted key. Clients can trust shape.

## Error Catalogue (non-exhaustive)

| Code                       | HTTP | When                                           |
| -------------------------- | ---- | ---------------------------------------------- |
| `AUTH_INVALID_CREDENTIALS` | 401  | Login wrong password/email                     |
| `AUTH_EMAIL_TAKEN`         | 409  | Register duplicate                             |
| `AUTH_TOKEN_EXPIRED`       | 401  | JWT exp past                                   |
| `AUTH_TOKEN_INVALID`       | 401  | Malformed/revoked token                        |
| `AUTH_UNAUTHORIZED`        | 401  | Missing auth                                   |
| `AUTH_FORBIDDEN`           | 403  | Role/owner mismatch                            |
| `VALIDATION_FAILED`        | 422  | Zod parse failed; `details` contains field map |
| `NOT_FOUND`                | 404  | Resource missing                               |
| `CONFLICT`                 | 409  | Unique constraint or state mismatch            |
| `RATE_LIMITED`             | 429  | Throttler tripped                              |
| `INTERNAL`                 | 500  | Unknown; logged with requestId                 |
| `PROFILE_HANDLE_TAKEN`     | 409  | Handle unique violation                        |
| `CONNECTION_SELF`          | 400  | Requester == receiver                          |
| `CONNECTION_DUPLICATE`     | 409  | Pair already exists                            |
| `CONNECTION_BLOCKED`       | 403  | Either side blocked                            |
| `POST_EMPTY`               | 400  | Body empty and no media                        |
| `MEDIA_TOO_LARGE`          | 413  | Size exceeds kind cap                          |
| `MEDIA_UNSUPPORTED`        | 415  | MIME not allowed                               |
| `JOB_CLOSED`               | 410  | `isActive=false`                               |
| `APPLICATION_DUPLICATE`    | 409  | Already applied                                |

## Versioning

- URL version `v1`. Breaking changes bump to `v2` via an additive controller prefix — never mutate `v1` after public launch.
