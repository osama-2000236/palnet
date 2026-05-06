# Sprint 14 Decisions — UGC Safety Backend

## Group-Room Blocked-Message Visibility

Group rooms remain visible to members, but messages authored by users in either side of a block relationship are excluded at the Prisma query layer for message lists and room previews. Direct-message rooms whose other participant is blocked either direction are hidden.

## Idempotency Contract

`POST /blocks` is idempotent and returns the existing block row when the blocker/blocked pair already exists. `DELETE /blocks/:blockedUserId` is idempotent and returns `204 No Content` whether or not a row existed.

## Notification Policy

New notifications are not created when actor and recipient are blocked in either direction. Existing notifications are not deleted retroactively, but list queries hide notification rows whose actor is now blocked either direction.
