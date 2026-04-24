# Sprint Plan

The only acceptable order. Each sprint has an explicit **Do** and **Do NOT** list so AI prompts stay in-scope.

All sprints follow the Definition of Done in [`project-spec.md §7`](../project-spec.md).

---

## Sprint 0 — Foundation (1 working session)

**Do:**

- `pnpm install` succeeds across the monorepo.
- `pnpm db:generate` produces the Prisma client.
- NestJS skeleton in `apps/api` boots on port 4000 with `/api/v1/health` returning `{ status: "ok" }`.
- Swagger available at `/api/docs`.
- Next.js skeleton in `apps/web` boots on port 3000 with RTL and `ar-PS` default.
- Expo skeleton in `apps/mobile` boots via `expo start` with `ar-PS` default.
- CI green on empty commit: lint + type-check + test (no-op).
- `.env.local` wired; app reads `DATABASE_URL` without crashing.

**Do NOT:**

- Write any feature code.
- Add libraries not listed in `project-spec.md §2.1`.
- Touch deployment yet.

---

## Sprint 1 — Auth + Onboarding

**Do:**

- API: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Bcrypt cost 12. Access 15 min, refresh 30 days (hashed in `RefreshToken`).
- Zod validation pipe at every controller. Zod schemas live only in `@palnet/shared`.
- Guard: `JwtAuthGuard` for protected routes.
- `POST /profiles/onboard` — create `Profile` with handle, name, headline, country.
- Web: `/login`, `/register`, `/onboarding` pages with RTL + Arabic copy.
- Mobile: Auth stack screens (Login, Register, Onboarding).
- Jest: unit tests for `AuthService` (register success, duplicate email, login wrong password, refresh rotation, refresh revoked).
- Playwright: one happy-path register→onboard→logout.

**Do NOT:**

- OAuth yet (Sprint 1.5).
- Email verification flow.
- Password reset flow (Sprint 2.5).
- Avatar upload (Sprint 3).

---

## Sprint 1.5 — OAuth (Google)

**Do:**

- `GET /auth/google`, `GET /auth/google/callback`.
- Link to existing `User` by email; create if new.
- Web + mobile "Continue with Google" button.

**Do NOT:**

- Apple Sign-In yet (required for iOS App Store review — do right before App Store submission).
- Facebook/LinkedIn-style OAuth (scope creep).

---

## Sprint 2 — Feed & Posting

**Do:**

- API: `POST /posts`, `GET /posts/:id`, `DELETE /posts/:id`, `PATCH /posts/:id`.
- API: `GET /feed` — cursor-paginated, chronological, union of self + connections + followed companies. Ranking is `ORDER BY createdAt DESC` only.
- API: `PUT /posts/:id/reaction`, `DELETE /posts/:id/reaction`.
- API: `POST /posts/:id/comments`, `GET /posts/:id/comments` (cursor), `DELETE /comments/:id`.
- API: `POST /posts/:id/reposts`, `DELETE /posts/:id/reposts`.
- Media upload: `POST /media/upload-url` returns signed R2 PUT URL; client uploads; client sends media refs with post body.
- Web: `/feed` at root (auth required), composer modal, post card component.
- Mobile: feed tab with infinite scroll, composer screen.
- Jest + Playwright + Detox for the composer happy path.

**Do NOT:**

- Algorithmic ranking, trending, hashtags, mentions, polls, articles, newsletters.
- Video transcoding (accept MP4 URL + thumbnail only).
- Edit history display.

---

## Sprint 3 — Profiles & Connections

**Do:**

- API: `GET /profiles/:handle` (public-safe DTO), `PATCH /profiles/me`.
- API: `POST/PATCH/DELETE /profiles/me/experiences/:id`, same for educations, skills.
- API: `POST /connections`, `POST /connections/:id/respond` (ACCEPT/DECLINE), `DELETE /connections/:id` (withdraw/remove), `POST /users/:id/block`.
- API: `GET /connections` (mine), `GET /connections/requests` (incoming pending), `GET /users/:handle/connections` (cursor).
- Web: `/in/:handle` profile page (SSR for SEO), `/me/edit`, `/my-network`.
- Mobile: profile screen, edit modal, my-network tab.

**Do NOT:**

- "People You May Know" recommendations (Sprint 6+).
- Mutual-connections display yet (easy add later).
- Endorsements of specific skills (Sprint 6+).

---

## Sprint 4 — Messaging & Notifications

**Do:**

- API: `POST /chat/rooms/dm`, `GET /chat/rooms`, `GET /chat/rooms/:id/messages` (cursor back in time), `POST /chat/rooms/:id/messages`, `POST /chat/rooms/:id/read`.
- WebSocket namespace `/chat`: `message.new`, `message.read`, `typing`.
- API: `GET /notifications`, `POST /notifications/read`.
- WebSocket namespace `/notifications`: `notification.new`.
- Web: bottom-right chat dock + dedicated `/messaging` page, notification bell in top nav.
- Mobile: Messaging tab, Notifications tab.
- Notification triggers: connection request, connection accepted, post reaction, post comment, message received.

**Do NOT:**

- Group chat UI (data model supports it; UI waits).
- Voice/video calls.
- Push notifications (Sprint 4.5 — requires APNs/FCM setup).
- Email digests.

---

## Sprint 4.5 — Push Notifications

**Do:**

- Expo push tokens persisted on login.
- API sends push via Expo's push service for high-signal events only (new message, accepted connection).
- In-app mute toggle per notification type.

---

## Sprint 5 — Jobs Board

**Do:**

- API: Company CRUD (`POST/GET/PATCH /companies`, `POST /companies/:id/members`).
- API: Jobs CRUD (`POST/GET/PATCH/DELETE /companies/:id/jobs`), `GET /jobs` (search + filters from `JobSearchQuery`).
- API: `POST /jobs/:id/apply`, `GET /me/applications`, `GET /companies/:id/jobs/:jobId/applications` (company admin only), `PATCH /applications/:id/status`.
- Web: `/jobs` search, `/jobs/:id` detail, `/company/:slug`, `/company/:slug/admin`, `/me/jobs`.
- Mobile: Jobs tab, job detail, apply flow, my applications.

**Do NOT:**

- Paid job promotion, featured slots.
- Recruiter workspace.
- Applicant tracking funnel stages beyond `ApplicationStatus` enum.
- Job alerts via email.

---

## Sprint 6+ — Post-PMF backlog (do not build yet)

- Company pages with posts/followers.
- Groups, events, newsletters.
- Verified badges (partner integration).
- Algorithmic feed ranking (lightweight Postgres-based first; ML later).
- Premium subscriptions.
- Admin/moderation console.
- Analytics dashboards.
- Ads manager.

## Sprint Hygiene

- One feature branch per sprint ticket. Merge to `main` via PR. Squash-merge only.
- Every sprint closes with: changelog entry in `CHANGELOG.md`, CI green, Playwright+Detox passing, Swagger up to date, migrations committed.
