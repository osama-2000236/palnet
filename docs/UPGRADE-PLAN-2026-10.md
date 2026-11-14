# Upgrade plan — 2026-10

Written after the 2026-10-13 logic review (branch `claude/app-upgrade-code-review-ed5f7f`). The
question asked was "what is missing to work like a mature professional network, and what should
be built next". This file answers it in two halves: what the review found and fixed, and the
ordered list of what is still owed. [`HANDOFF.md`](HANDOFF.md) stays the live record; this is the
reasoning behind its next rows.

Baydar is not copying LinkedIn's UI (see `CLAUDE.md`). What it does copy is the _logic_ every
professional network converges on: who can see what, who is told what, and what a block, an
expiry or a deletion actually does. That is where this review looked.

## 1. Fixed in this pass

Each fix carries a test that fails when the fix is reverted (checked by mutating the code and
watching the test go red).

| #   | What was wrong                                                                                                                                              | Fix                                                                                                                            | Commit    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- |
| 1   | Expired jobs stayed listed and kept accepting applications                                                                                                  | list, detail-apply and public page all check `expiresAt`                                                                       | `f1e7623` |
| 2   | Registering could take the email or handle of an account still inside its 30-day restore window, so the restore later collided                              | pending-deletion holders keep their email and handle until the purge                                                           | `a45d28b` |
| 3   | Deleting a company hard-cascaded jobs that other people had applied to                                                                                      | refuse with a clear error while the company holds others' data                                                                 | `48a44a6` |
| 4   | Comment, reaction, repost and endorse ignored blocks                                                                                                        | one block check, either direction, on every write between two people                                                           | `1813218` |
| 5   | A blocked person could still open the blocker's profile                                                                                                     | profile read honours blocks both ways                                                                                          | `1813218` |
| 6   | Comment replies could be written but were never shown, yet were counted                                                                                     | count only shown comments; then ship one-level threads on both platforms (`97d3f79`)                                           | `85a5360` |
| 7   | Two people inviting each other got a duplicate-invite error; a declined invite could be re-sent instantly                                                   | a crossed invite accepts; declined invites cool down                                                                           | `c8a1b96` |
| 8   | Feed was newest-first, connections only: a new member saw nothing and reposts never travelled                                                               | ranked 200-post slate per viewer, frozen 30 min, with reposts, out-of-network and city candidates, diversity and a reason line | `548ac5a` |
| 9   | Feed query walked the global `createdAt` index                                                                                                              | bounded candidate pools per route                                                                                              | `548ac5a` |
| 10  | An employer was never told someone applied                                                                                                                  | `JOB_APPLICATION_RECEIVED` notification to the poster, first apply only                                                        | `dab4906` |
| 11  | Register asked mobile users to accept terms they could not open                                                                                             | links to both documents in the user's locale                                                                                   | `f1f1819` |
| 12  | Blocking left the connection (or a pending invite) in place, so the blocked person still counted as a connection and could accept an invite after the block | block and connection delete run in one transaction                                                                             | `0e3fea3` |

## 2. Roles — what each must be able to do, and where it stands

| Role          | Must be able to                                                                                                 | Gap                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Member        | build a profile, connect, post, comment and reply, react, repost, message, apply, block and report, export a CV | mobile CV export (HANDOFF #6); no "who viewed your profile"; no @mentions                                              |
| Employer      | post a job, see and move applicants, be told of new applicants, rate a hire                                     | ratings have a complete API and no UI (HANDOFF #3); an individual poster has no applicants list outside a company page |
| Company admin | share one company page and its jobs with a team under OWNER / ADMIN / EDITOR                                    | team management has a complete RBAC API and no UI (HANDOFF #4), so every company is effectively one person             |
| Moderator     | review reports, act on a post, comment or account, see what was done                                            | built and admin-gated; no change owed from this review                                                                 |

## 3. What to build next, in order

Order is by how much a real user notices the absence, then by size.

### P1 — the roles above actually work

1. **Company team UI** (HANDOFF #4). Invite by handle, change role, remove; web settings page and
   mobile twin. API exists at `company-members.controller.ts`.
2. **Ratings UI** (HANDOFF #3). Prompt after a hire moves to `HIRED`; show the summary on profile
   and company page. API exists at `ratings.controller.ts`.
3. **Applicants list for individual posters.** The data is there; only the company surface
   reads it.
4. **Mobile `/j/[id]`** (HANDOFF #7). A job shared into WhatsApp must land somewhere on a phone.

### P2 — the notifications the schema already promises

`PROFILE_VIEW` and `POST_MENTION` exist in `NotificationType` (`schema.prisma`) and in the push
copy, and nothing writes either.

5. **Mentions.** Parse `@handle` in post and comment bodies against real handles, store the
   mention, notify, render as a profile link on both platforms. Respect blocks.
6. **Profile views.** Record a view (deduplicated per viewer per day, never for self or a blocked
   pair); show a count and the recent viewers. Decide premium gating before building the list.

### P3 — feed, following `docs/design/FEED-RANKING.md` §11

F3 and F4 landed in `548ac5a` with engagement and affinity signals only.

7. **F1 topic tagger** — deterministic tags on posts; useful for search on its own.
8. **F2 negative feedback** — "not interested" and "hide posts from this person", feeding
   `InterestWeight`. Without it the ranker can only learn what people like, never what they don't.
9. **Per-viewer `order=recent` switch**, so a member can opt out of ranking without the global flag.
10. **Sweep stale `FeedSlate` rows** in the existing retention cron.

### P4 — conversation completeness

11. **"Show more replies"** — replies are inlined up to 50 per root comment.
12. **Comment delete and timestamps** on both platforms; the API already supports delete.
13. **Copy divergence** (HANDOFF #9) — reconcile the 30 `unreconciled` keys.

## 4. The Arabic touch — rules every item above follows

- Every string lands in `ar` first, Palestinian register, reviewed against
  `docs/audit/ARABIC-REGISTER-2026-07-25.md`; `en` is the fallback.
- Names and user text sit in `.bidi-plaintext`; numbers go through `formatNumber` with the
  viewer's locale, never interpolated raw.
- Logical properties only (`ms-*`, `marginStart`); no `left`/`right`.
- Reason lines and notifications name a person, never a system ("أعاد أحمد نشر هذا", not
  "Recommended for you").
- Every person shown carries an avatar.

## 5. Launch — still owner-gated

Unchanged by this pass and listed in full in [`HANDOFF.md`](HANDOFF.md) "Launch blockers":
production env and credentials (mail, payments, scanners, Sentry), store and signing ids,
real-device smoke, the native-speaker Arabic copy review, and legal counsel on
`legal-copy.tsx`. No code change closes any of these.
