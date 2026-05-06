# Sprint 19 Decisions — Account Deletion And Export

Date: 2026-05-06

## Decisions

- Account deletion is a soft delete for this sprint. The API sets `User.deletedAt` and keeps the row for foreign-key integrity.
- The restore grace window is 30 days from `deletedAt`.
- A new `User.pendingDeletionSnapshot` JSON column stores the original email plus profile display PII needed for restore.
- Deletion anonymizes email to `deleted_<userId>@deleted.local` and clears profile name/headline/avatar fields. Profile handle uses `deleted_<userId>` to keep the unique, required handle constraint valid.
- Refresh tokens are revoked on delete.
- Password hash remains present during the grace period so public restore can verify email and password. Hard-delete and password scrubbing are deferred to a scheduled retention job.
- Export is synchronous JSON for v1. Async export, ZIP packaging, and email delivery are deferred.
- Mobile export sharing is surfaced as blocked because `expo-sharing` is not installed and no new dependency was approved.

## Follow-Ups

- Add scheduled hard-delete retention job after the 30-day grace period.
- Decide whether the hard-delete job should scrub password hashes before deleting rows in environments with delayed physical deletion.
- Add async export storage and notification path if export payloads become too large for synchronous download.
