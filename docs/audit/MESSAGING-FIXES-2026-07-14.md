# Messaging fixes — 2026-07-14

> **VERIFY BEFORE MERGE:** This work was implemented by one agent (Grok / ponytail ultra).
> **A second, independent AI (or human) must verify** before treating it as done.
> Do not self-approve. Run the checklist below on a clean tree and record pass/fail.

## Intent

Close the highest-severity messaging gaps found in the full messaging review:

| # | Problem | Fix |
|---|---------|-----|
| 1 | Archived rooms never resurfaced when a peer (or self) sent a new message | `clearRoomArchives(roomId)` on successful send + idempotent retry |
| 2 | Concurrent same-`clientMessageId` could throw uncaught Prisma `P2002` | Catch unique violation → re-fetch winner row |
| 3 | Concurrent open-DM could create two 1:1 rooms | `pg_advisory_xact_lock(hashtext(pair))` inside `$transaction` |
| 4 | Block only failed at send, not at open-DM | `rejectBlockedRoomSend` before DM create |
| 5 | Whitespace-only body accepted by API | `body.trim()` + reject empty |
| 6 | Mobile missing load-older history | `loadOlder` + header button (limit 30 pages) |
| 7 | Mobile missing typing | Throttled POST typing + SSE expire TTL (5s) |
| 8 | Web edit/delete bumped room list order with stale `createdAt` | Keep `room.updatedAt` on edit/delete inbox patch |

## Files touched

### API
- `apps/api/src/modules/messaging/messaging.service.ts`
- `apps/api/src/modules/messaging/messaging.service.spec.ts`

### Mobile
- `apps/mobile/app/(app)/_message-thread/utils.ts`
- `apps/mobile/app/(app)/_message-thread/messageThreadEvents.ts`
- `apps/mobile/app/(app)/_message-thread/useMessageThread.ts`
- `apps/mobile/app/(app)/_message-thread/MessageThreadList.tsx`
- `apps/mobile/app/(app)/messages/[roomId].tsx`
- `apps/mobile/src/i18n/en.json` — key `messaging.typing`
- `apps/mobile/src/i18n/ar.json` — key `messaging.typing`

### Web
- `apps/web/src/app/[locale]/(app)/messages/_hooks/useRoomMessagesEvents.ts`

### Docs
- this file
- `docs/HANDOFF-FABLE5-2026-07.md` (pointer)

## Explicit non-goals (do not re-open in verify unless broken)

- Media attach UI
- Web archive UI
- MessageRequest entity (still derived `isRequest`)
- Delivered receipt state
- Redis bus (may already be on origin separately)

## Verification checklist for the second AI

### A. Static / gates

```powershell
pnpm --filter @baydar/db generate   # first after clone
pnpm --filter @baydar/api test -- messaging.service.spec
pnpm --filter @baydar/api type-check
pnpm --filter @baydar/mobile type-check
pnpm --filter @baydar/web type-check
pnpm --filter @baydar/mobile test
# i18n parity must stay 0/0 after messaging.typing
```

Expect: all green. Fail → block merge.

### B. Code review (must open files, not only trust this doc)

1. **`sendMessage`**
   - [ ] Trims body; rejects empty after trim
   - [ ] Early idempotent path calls `clearRoomArchives`
   - [ ] `P2002` path re-fetches by `(roomId, authorId, clientMessageId)` and does **not** double-notify
   - [ ] Success path clears archives + updates `updatedAt` + sender read cursor + bus fan-out + notify others
2. **`findOrCreateDm`**
   - [ ] Block check before transaction
   - [ ] Advisory lock key is sorted pair (`[a,b].sort().join(":")`)
   - [ ] Create happens only inside the locked transaction
3. **Mobile thread**
   - [ ] `hasMore` / `nextCursor` wired from page meta
   - [ ] `loadOlder` prepends older messages (API returns desc; client reverses)
   - [ ] Typing POST throttled ≥3s; SSE typing TTL ~5s; own typing ignored
   - [ ] `message.new` mark-read only when `authorId !== viewerId`
4. **Web**
   - [ ] Edit/delete room list patch does not reorder inbox by message `createdAt`
5. **Tests**
   - [ ] Specs cover: block on open-DM, blank body, P2002 race, archive clear on create/idempotent
   - [ ] Existing messaging specs still pass

### C. Manual smoke (if API + clients available)

1. User A archives room → User B sends → room reappears for A (list after refresh / re-focus).
2. Double-tap send with same client id → one message row, no 500.
3. Two parallel open-DM to same peer → one room id (needs real DB + concurrent clients or SQL check).
4. Mobile: load older when >30 messages; typing indicator while peer types.

### D. Verdict format (second AI must write this)

```
VERDICT: APPROVED | CHANGES REQUESTED
Gates: pass|fail
Review findings: (bullets)
Manual smoke: pass|skip|fail
Signed: <agent name>, <date>
```

Append the verdict to this file or open a PR comment. Owner merges only on **APPROVED**.

### Second-AI verification (2026-07-22)

```
VERDICT: APPROVED (API surface)
Gates: pass
Review findings:
- sendMessage trims body, rejects whitespace-only, clears archives on create + idempotent + P2002
- findOrCreateDm blocks before tx, advisory lock on sorted pair key, create only inside lock
- Specs cover block-on-open-DM, blank body, P2002 race, archive clear on create/idempotent
- Full messaging.service.spec suite green (with security suite)
Manual smoke: skip (no live multi-client DB in this session)
Signed: Grok 4.5 (bb-local-toolkit QA pass), 2026-07-22
```

Note: mobile/web client messaging files in the same WIP still need a focused client smoke when a device is available; API/service gate is green.

## Known residual risks

- Advisory lock requires PostgreSQL (`hashtext`). Tests mock `$transaction` / `$executeRaw`.
- Clearing **all** members’ archives on send is intentional (including the archiver who re-engages).
- Mobile inbox list still has no live SSE (focus refresh only) — out of scope.
- Local tree may be behind `origin/main` Redis fan-out work; rebase carefully if both touch buses.
