# Sprint 18 Decisions — Email Verification And Password Reset

- Mail provider integration is deferred. The API uses a provider-agnostic `MailService` with console transport only.
- Verification and reset tokens are opaque to clients, SHA-256 hashed at rest, time-limited, and single-use.
- Forgot-password and verify-email send endpoints are enumeration-safe and return `202 Accepted` even when the email does not map to a user.
- Login remains allowed for unverified users in this sprint; forced verification and banners are separate UX work.
- Password reset invalidates all active refresh tokens for the user by setting `RefreshToken.revokedAt`.
- Migration files are generated in the repo but not deployed by Codex. The user runs `pnpm --filter @baydar/db db:migrate`.
