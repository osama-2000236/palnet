# API Contract

Base path: `/api/v1`. Swagger is available at `/api/docs`. Request and response contracts are backed by Zod schemas in `packages/shared/src/schemas`.

## Conventions

- Protected routes use `Authorization: Bearer <accessToken>`.
- Refresh is handled by `/auth/refresh` with a stored refresh token.
- Success responses use `{ data, meta? }`.
- Errors use `{ error: { code, message, details? } }`.
- Cursor pagination uses `after` and `limit` with `{ nextCursor, hasMore, limit }` metadata.
- Live app updates use SSE streams from the API, not legacy socket namespaces.
- Timestamps are ISO 8601 UTC strings.

## Core Endpoints

### Health

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

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

- `POST /media/upload-url`

Returns signed upload data and media metadata. Current blurhash support is a deterministic API placeholder, not image-byte decoding.

### Messaging

- `GET /messaging/rooms`
- `POST /messaging/rooms`
- `GET /messaging/rooms/:id/messages`
- `POST /messaging/rooms/:id/messages`
- `POST /messaging/rooms/:id/read`
- `POST /messaging/rooms/:id/typing`

### Live Messaging

- `GET /messaging/stream`

The stream sends events such as new messages, read state, typing state, and room updates for the authenticated user.

### Notifications

- `GET /notifications`
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

- `GET /search/people`
- `GET /search/posts`
- `GET /search/jobs`
- `GET /search/companies`

## Security Invariants

- Never return password hashes, refresh token hashes, or private email addresses to non-owners.
- Validate every controller boundary with shared schemas or equivalent Zod validation.
- Keep auth, ownership, suspension, and role checks in guards/services, not UI-only logic.
- Do not expose access tokens in query strings; mobile SSE sends bearer headers.
