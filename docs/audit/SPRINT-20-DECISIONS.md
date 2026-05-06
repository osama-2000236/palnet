# Sprint 20 Decisions — Security Hardening

Date: 2026-05-06

## Decisions

- Browser SSE no longer uses access tokens in URLs. The web client calls `POST /auth/stream-token`, receives a one-time token scoped to `messaging` or `notifications`, and passes it as `?token=`.
- Stream tokens live in `SseStreamToken`, are SHA-256 hashed, expire after 60 seconds, and are consumed with an atomic `consumedAt: null` update.
- Mobile SSE keeps bearer-header authentication because `react-native-sse` supports custom headers.
- Web CSP is configured in `apps/web/next.config.mjs`: report-only outside production, enforced in production. Inline scripts are not allowed. The allowlist is limited to self, Sentry, PostHog, and R2/media origins, with the API origin included when configured separately.
- Security headers are emitted by Next for all paths: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, and production-only HSTS.
- Route-level rate limits are explicit via `@RateLimit(...)` and in-memory per process for this sprint. Tunings: media 30/hour, search 60/min combined, content create 30/hour combined, messaging send 120/min, push device register 10/hour, safety action 30/hour combined.
- Media presign enforces MIME/kind/size before signing: image JPEG/PNG/WebP/GIF up to 10 MB, PDF up to 25 MB, MP4 up to 100 MB.
- Production CORS must set explicit origins. Missing `CORS_ORIGINS` and `*` are boot-time failures.

## Rationale

- One-time stream tokens remove bearer credentials from browser URLs while preserving EventSource compatibility.
- CSP starts report-only in development so local iteration can surface violations without breaking the dev server; production enforces the policy.
- Rate-limit classes keep related endpoints in shared buckets, which matters most for search and content creation abuse.
- MIME allowlisting is a pragmatic presign-time control. It does not claim file-byte inspection.

## Deferred

- Redis-backed rate-limit and SSE pubsub storage for multi-instance deployments.
- Virus scanning, NSFW scanning, and quarantine workflows after upload.
- httpOnly refresh-cookie migration.
- WebAuthn / 2FA.
- Orphaned R2 object lifecycle cleanup after abandoned presigned uploads.
