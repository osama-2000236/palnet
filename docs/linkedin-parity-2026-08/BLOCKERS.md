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

---

## P2 · the alumni and diaspora screens are not built

**What.** `GET /discovery/alumni` and `GET /discovery/diaspora` exist, are
pinned in the route-coverage spec, and return the same decorated person shape
the suggestions list uses. §6.6 also asks for `network/alumni` and
`network/diaspora` routes on both platforms, and those are not built.

**Why it is written here rather than quietly skipped.** The endpoints are
reachable and correct; what is missing is a screen to reach them from. That is
a smaller gap than it looks — the panels are the same list component the
followers tab already uses, with a filter above it — but it is a gap, and the
phase is not closed while it is open.

**One thing to decide first.** `diaspora` filters origin by deriving the
governorate from the stored city, because `Profile.originGovernorate` is a P3
column and does not exist yet. The screen is worth building after P3 lands it,
or the filter will be rewritten a fortnight later.

**Not a blocker for P3.** Nothing in identity and evidence depends on these two
screens, and P3 is what makes the diaspora filter honest.

---

## P3 · SMS has no provider, so phone verification cannot run in production

**What.** `SMS_GATEWAY_URL` and `SMS_GATEWAY_TOKEN` are now required in
production, and no value exists for either. Without them the API refuses to
boot — deliberately, the same rule `MailModule` already follows: the alternative
is a production that logs "sent" for a code nobody received, and a member
staring at a form that will never accept anything.

**Why it is a blocker rather than a bug.** A gateway is a commercial
relationship. The operators that reliably deliver to +970 and +972 numbers are
regional, and picking one is an owner decision with a contract behind it. The
code takes a generic bearer-token POST precisely so the choice is an environment
change rather than a deploy.

**What works meanwhile.** Everything except delivery. In dev and test the code
prints to the log, the whole flow is exercisable end to end, and `otp.service.spec.ts`
covers the five walls that make a six-digit secret safe.

**Blast radius if it ships unset:** the API does not boot. That is the intended
failure — loud, immediate, and before any member sees it.

---

## P3 · the CV is HTML, not PDF

Recorded in full as GAP-09. Short version: the server assembles the document and
the platform renderer makes the PDF, because a server-side PDF needs either a
Chromium per render on the API host or a library that spells Arabic backwards.
`expo-print` would close the last gap on mobile in about five lines; it is a
native module and needs a dev-client rebuild, which is owner-gated.
