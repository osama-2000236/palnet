# Perf baseline — 2026-07-14 (local)

First recorded baseline for the `pnpm load:api:smoke` profile (30s,
arrivalRate 2, authenticated journey scenario in `tools/load/local.yml`).
Referenced by the pre-flight checklist in `docs/deployment.md` §6 — staging
numbers should be compared against a staging rerun of this profile, not
against these local numbers directly.

## Environment

- Windows 11 dev machine, API `nest start --watch` (dev build, not prod),
  local Postgres `palnet`, no Redis (`REDIS_URL` unset).
- Fixture: `pnpm --filter @baydar/db qa:load-fixture --run-id=qa-perf0714 --users=10`.

## Results (smoke profile, after idempotency-race fixes)

| Metric        | Value             |
| ------------- | ----------------- |
| Requests      | ~840 per run      |
| 2xx           | 100% (no 4xx/5xx) |
| median        | 3–5 ms            |
| p95           | ~228 ms           |
| p99           | ~233 ms           |
| vusers failed | 0                 |

## Findings from the first run (fixed in the same session)

The first smoke run produced **2× HTTP 500** from check-then-create races on
unique constraints under concurrent duplicates:

- `POST /jobs/:id/apply` — `(jobId, applicantId)` unique, P2002 → 500.
- `POST /messaging/rooms/:id/messages` — `(roomId, authorId, clientMessageId)`
  idempotency unique, P2002 → 500 on a concurrent retry.

Both now catch P2002 and return the winner's row (idempotent success);
covered by unit specs. Post-fix rerun: zero 5xx.

## Rerun instructions

```powershell
# API running on :4000 with .env.local
pnpm --filter @baydar/db qa:load-fixture --run-id=qa-<id> --users=10
pnpm load:api:smoke     # or baseline/high/spike per deployment.md
```

## What to do with these numbers

This file is a measurement, not a plan. The ranked work it feeds —
and why this local, no-Redis, watch-mode profile cannot validate the
caching items in it — is [`OPTIMIZATION-PLAN.md`](OPTIMIZATION-PLAN.md) §0.
