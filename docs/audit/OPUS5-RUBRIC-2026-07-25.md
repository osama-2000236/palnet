# OPUS5 rubric — screen scores (2026-07-25)

Five dimensions from `docs/design/screen-critique-2026-07.md`: **philosophy,
hierarchy, detail, functionality, restraint**, scored 1–10. Ship gate is ≥7;
below that is a defect with a required fix, not an opinion.

Evidence is the web matrix at `apps/web/.qa-shots/`, filename given per row.
The matrix is gitignored — regenerate with `node e2e/shots.mjs` from
`apps/web`, then `node e2e/contact-sheet.mjs` to tile it for review.

## Coverage, stated before the numbers

**46 of 85 screens are scored here — the whole web surface at
`ar-PS / light / desktop`.** Every one was looked at, on four contact sheets,
with the uncertain ones opened at full resolution. That is the honest number
and it is deliberately not padded.

Not scored, and why:

| Not scored                                              | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The other three web cells (dark, `en`, mobile viewport) | Captured and machine-checked, not eye-reviewed. Layout scores carry across a theme or locale swap; detail scores do not, so I am not copying numbers sideways to make the table look complete.                                                                                                                                                                                                                                                                                        |
| 38 mobile screens                                       | Not captured this session. The emulator plus a Metro instance from _this_ worktree is a known multi-hour setup in this repo, and this session had already moved 52 mobile files — bundling from the wrong worktree would have produced a matrix of the previous code, which is worse than no matrix. **Captured and scored on 2026-07-26 — see [OPUS5-ROUND3-2026-07-26.md](./OPUS5-ROUND3-2026-07-26.md). The deferral was right: both default ports were held by other worktrees.** |

The previous session viewed roughly 20 of 520 images and said so. This one
viewed 46 of 46 in one cell and says so. Neither is the 520 the charter asked
for, and the remaining gap is real work, not a rounding error.

Three defects came out of this pass and are fixed in `c18768a`: the landing
page inviting signed-in members to create an account, `/settings/security`
printing raw user-agent strings, and the harness photographing a redirect
interstitial as if it were a screen.

## Web — `ar-PS` / light / desktop

Ph = philosophy, Hi = hierarchy, De = detail, Fn = functionality, Re = restraint.

| Screen                   | Ph  | Hi    | De    | Fn        | Re  | Note                                                                                                                |
| ------------------------ | --- | ----- | ----- | --------- | --- | ------------------------------------------------------------------------------------------------------------------- |
| `home` (signed out)      | 9   | 9     | 8     | 9         | 8   | The strongest screen in the product. Brand mark, hero, three value props, employer track, legal footer.             |
| `home-authed`            | 9   | 9     | 8     | **9** (5) | 8   | Same page; scored 5 on functionality before `c18768a` — primary CTA was "create an account" for a signed-in member. |
| `feed`                   | 8   | 8     | 8     | 8         | 7   | Three-column desktop layout is used properly. Composer, profile-completion meter, jobs rail all earn their place.   |
| `jobs`                   | 8   | 8     | 8     | 8         | 8   | Filter rail plus results; density is right.                                                                         |
| `job-detail`             | 8   | 8     | 8     | 8         | 8   | Apply CTA is unmissable, skill chips read well.                                                                     |
| `job-public` (`/j/`)     | 9   | 8     | 7     | 8         | 9   | Right anatomy for a shared link. `og:image` still missing (known, needs an asset).                                  |
| `search`                 | 8   | 8     | 8     | 8         | 8   | Tabs plus rows with avatars; connection state per row.                                                              |
| `network`                | 8   | 8     | 8     | 8         | 8   | Avatars everywhere a person appears, as the rule requires.                                                          |
| `notifications`          | 8   | 7     | 8     | 8         | 8   | Thin at one row, but that is the data, not the design.                                                              |
| `messages`               | 8   | 8     | 8     | 8         | 8   | Two-pane; thread and list both legible.                                                                             |
| `messages-new`           | 8   | 7     | 8     | 8         | 7   | Plain form, a lot of empty page below it at 900px.                                                                  |
| `me-connections`         | 8   | 8     | 8     | 8         | 8   | Clean list.                                                                                                         |
| `profile-public`         | 8   | 8     | 8     | 8         | 8   | Cover, avatar overlap, tabs. Reads as a profile.                                                                    |
| `me` (redirect stub)     | —   | —     | —     | —         | —   | Not a screen. Resolves the handle and replaces to `/in/<handle>`. **Excluded from scoring**, see the note below.    |
| `me-edit`                | 8   | 7     | 8     | 8         | 7   | Long stacked form; sections are separated but all identical in weight.                                              |
| `me-karama`              | 8   | 8     | 8     | 8         | 8   | Balance, ledger, redeem cards.                                                                                      |
| `me-premium`             | 8   | 8     | 8     | 8         | 8   | Free vs paid comparison; terracotta CTA is the one place the accent earns its loudness.                             |
| `saved`                  | 8   | 7     | 8     | 7         | 8   | One item; no type filter yet, fine at this volume.                                                                  |
| `activity`               | 8   | **6** | 7     | 8         | 7   | Three stat cards of equal weight, led by a zero. Three different container treatments stacked. See below.           |
| `cv`                     | 7   | 7     | 7     | 7         | 9   | Print affordance is clear; empty sections hidden honestly.                                                          |
| `company`                | 8   | 8     | 8     | 8         | 8   | Verified badge, jobs with chips, localized country.                                                                 |
| `employer`               | 8   | 8     | 8     | 8         | 8   | Illustrated empty state with a single clear action.                                                                 |
| `employer-new`           | 8   | 7     | 8     | 8         | 7   | Form; same stacked-fields treatment as the rest.                                                                    |
| `employer-detail`        | 8   | 8     | 8     | 8         | 8   | Stat tiles, job rows with applicant counts.                                                                         |
| `employer-billing`       | 7   | 7     | 8     | 8         | 8   | Plan cards read clearly; the bank rail is honestly gated.                                                           |
| `employer-job-new`       | 8   | 7     | 8     | 8         | 7   | Long form, correct RTL, salary/currency pairing is right.                                                           |
| `employer-applicants`    | 8   | **6** | 7     | 7         | 7   | Empty state is a bare line of text where every other empty state in the product gets an illustration. See below.    |
| `admin-moderation`       | 8   | 8     | 8     | 8         | 8   | Illustrated empty state, tab-aware copy.                                                                            |
| `admin-billing`          | 8   | 8     | 8     | 8         | 8   | Same treatment; the two admin queues are consistent with each other.                                                |
| `settings`               | 8   | 8     | 8     | 8         | 8   | Index of sections, one row each.                                                                                    |
| `settings-account`       | 8   | 8     | 8     | 8         | 8   | Destructive zone visually separated in terracotta.                                                                  |
| `settings-appearance`    | 8   | 7     | 8     | 8         | 8   | Sparse, but there are genuinely two controls.                                                                       |
| `settings-blocked`       | 8   | 8     | 8     | 8         | 8   | Illustrated empty state.                                                                                            |
| `settings-privacy`       | 8   | 7     | 8     | 7         | 8   | Honest "disabled until the server supports it" notice. Nearly empty page, but the honesty is the right call.        |
| `settings-notifications` | 8   | 8     | 8     | 8         | 7   | Dense two-column switch grid; the densest screen in the product and still readable.                                 |
| `settings-security`      | 8   | **6** | **4** | 7         | 6   | **Fixed in `c18768a`.** Fifteen session rows of raw user-agent. Re-score after the next capture.                    |
| `login`                  | 7   | 7     | 7     | 8         | 8   | Correct and plain. No brand presence at all, unlike the landing page it is one click from.                          |
| `register`               | 7   | 7     | 7     | 8         | 8   | Same.                                                                                                               |
| `forgot-password`        | 7   | 7     | 7     | 8         | 8   | Same.                                                                                                               |
| `reset-password`         | 7   | 7     | 7     | 8         | 8   | Shot in its invalid-token state, which is the state a stale link actually produces.                                 |
| `verify-email`           | 7   | 7     | 7     | 8         | 8   | Same.                                                                                                               |
| `onboarding`             | 8   | 8     | 8     | 8         | 8   | Step progress, one question per step.                                                                               |
| `legal-tos`              | 7   | 7     | 7     | **6**     | 9   | See the legal-shell note below.                                                                                     |
| `legal-privacy`          | 7   | 7     | 7     | **6**     | 9   | ditto                                                                                                               |
| `legal-community`        | 7   | 7     | 7     | **6**     | 9   | ditto                                                                                                               |
| `legal-employer`         | 7   | 7     | 7     | **6**     | 9   | ditto                                                                                                               |

Every row clears the ≥7 gate except the four bolded cells, which are covered
below. `me` is excluded rather than scored, because scoring a redirect stub on
hierarchy would be scoring a screen the user never sees for longer than a
network round trip.

## Sub-7 findings

### `settings-security` — detail 4, hierarchy 6, restraint 6 · **fixed**

The one screen whose entire job is letting a member recognise a session that
is not theirs printed `session.device` verbatim: fifteen rows of
`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like
Gecko) Chrome/141.0.0.0 Safari/537.36`. It is the same defect class as the
moderation queue's cuid soup that a previous pass fixed — an internal
identifier rendered where a human name belongs — and the consequence is worse,
because an unreadable session list is a security control nobody exercises.

Fixed in `c18768a` with `formatUserAgent` in `@baydar/shared` ("Chrome ·
Windows"), full UA retained in `title`.

### `activity` — hierarchy 6

Two separate problems, both visible at full resolution
(`activity__ar-PS__light__desktop.png`):

1. The three stat cards are identical in visual weight, and the one leading
   the row (rightmost, so first in RTL) is "٠ تحديثات غير مقروءة" — a zero.
   The screen opens on its least actionable number.
2. Three different container treatments stack down the page: bare stat cards,
   then a bordered card with internal rows, then a bare heading with two loose
   cards. `CLAUDE.md` asks for the five surface variants to be used
   _intentionally_; here they read as three unrelated decisions.

Not fixed. This is a layout composition change on a screen that is otherwise
correct, and it belongs with whoever owns the Pass 2 design work rather than
in an audit branch — the fix is a judgement about what `/activity` is for, not
a defect with one right answer.

### `employer-applicants` — hierarchy 6

The empty state is a single line of text under a filter row, in a page
otherwise full of whitespace. Every other empty state in the product —
`employer`, `settings-blocked`, `admin-moderation`, `admin-billing`, `saved` —
gets the shared illustrated `EmptyState`. The one an employer hits first,
immediately after posting their first job and before anyone has applied,
gets the least. Not fixed, same reason as above: it is a design decision about
what to say to an employer with no applicants yet, and the illustration kits
exist precisely so that decision is cheap once someone makes it.

### The four `legal/*` pages — functionality 6

They render with no application chrome at all: no header, no nav, no back
link. A member who follows the footer link to `/legal/privacy` can only return
with the browser back button. The copy being v0.1 placeholder is known and
`BLOCKED` on counsel, but the missing shell is an engineering gap, not a copy
gap, and it is the same on all four.

Not fixed here because it needs a decision about whether legal pages sit
inside the app shell or keep their own minimal chrome with a back affordance —
and the landing page's own minimal header is the obvious precedent to reuse.

## Observations that are not defects

- **The auth screens are correct and characterless.** `login`, `register`,
  `forgot-password`, `reset-password`, `verify-email` all score 7 across the
  board — they work, they are RTL-correct, they are labelled, and they carry
  none of the brand the landing page one click away is full of. Seven is a
  pass, so this is not a required fix. It is the largest single gap between
  "clears the gate" and "good", and it is the cheapest to close.
- **Form screens share one treatment.** `me-edit`, `employer-new`,
  `employer-job-new`, `onboarding` and the auth screens are all stacked
  full-width fields. Consistent, which is worth more than variety, but it does
  mean a 20-field form and a 2-field form look the same.
- **Desktop uses a centred ~910px column** on most surfaces. On first look at
  a contact sheet I read this as content pinned to one side and was wrong —
  RTL text alignment inside a centred container reads as right-hugging when
  the tile is 340px wide. Full resolution settled it. Worth writing down
  because it is the exact failure mode the charter warns about: judging from
  a thumbnail.

## Method

1. `node e2e/shots.mjs --locale=ar-PS --theme=light` from `apps/web`.
2. `node e2e/contact-sheet.mjs --filter=__ar-PS__light__desktop --cols=4 --rows=3`.
3. Four sheets reviewed at 12 tiles each; anything ambiguous opened at full
   resolution before being written down.
4. `_console__*.json` cross-checked for every cell — this is what identified
   the corrupted first run (see the corrections section of
   [OPUS5-ROUND2-2026-07-25.md](./OPUS5-ROUND2-2026-07-25.md)) and it is the
   step that separates "the screen is wrong" from "the harness is wrong".
