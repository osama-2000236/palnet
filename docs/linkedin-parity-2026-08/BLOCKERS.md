# Blockers

Every gate that failed and could not be fixed inside its phase, with the
diagnosis. A green build with a suppressed check is worse than a red one, so a
failure that cannot be fixed is written down here and reported rather than
worked around.

**Format:** phase · gate · what failed · what was tried · what it needs.

---

No gate has failed. The one entry below is evidence that could not be gathered
here, not a gate that went red.

Owner-input items are not blockers and are not listed here — every one of them
has a designed fallback, ships behind its env var, and is tracked in the master
spec §21. A feature that degrades honestly is not blocked.

---

## P1 · `apps/web/e2e/two-g.spec.ts` — written, not yet run

**What.** The 2G journey spec exists, type-checks and lints, and is not proven
green, because Playwright here needs the QA stack: a seeded Postgres, the API
on its own port, and `next dev` or `next start` on another. This worktree
shares that database with other worktrees, and `docs/HANDOFF.md` already
records that parallel runs against it fail as a mass regression rather than as
contention.

**How to run it:**

```bash
pnpm --filter @baydar/web exec playwright test e2e/two-g.spec.ts --project=chromium-ar
```

**What to expect the first time.** The budgets are 8s to first contentful paint
and 12s to interaction-ready at 30 kbit/s with a 400 ms round trip. If they
fail, the number in the failure message is the finding — record it and fix the
payload, not the threshold. The timings are attached to every run, passing or
not, so a run at 7.9 seconds is the warning before the failing one.

**Not a blocker for anything else.** Nothing in P1 depends on it; it is the
evidence-verified half of the phase, and it is written down here rather than
quietly skipped.
