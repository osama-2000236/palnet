# STUDIO_BACKLOG

Running ledger for the studio loop. One line per finding, with the evidence that
produced it. **Findings here are measured, not eyeballed** — a screenshot starts
an investigation, a measurement closes it. Two entries below are recorded as
_not_ bugs precisely because the measurement disagreed with the screenshot.

Last pass: 2026-08-28, iteration 7. Surfaces audited: web `/feed` (`empty` and
seeded, ar-PS + en, light + dark, 390px / 1100px / 1440px) and the mobile feed on
a booted `Pixel_7_Pro`. Iteration 1 shipped as #151.

---

## P0 — critical

_None open._

| #    | Finding                                                                                                                                                                                                                                                                                                                                                                                                                     | Status                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| P0-1 | **The screenshot harness could not photograph any non-default state.** `apps/web/e2e/shots.mjs` intercepted `**/api/v1/**` for `empty`/`long` and called `route.fetch()` on the two `@Sse("stream")` endpoints. An SSE response never closes, so the callback outlived the page and the run died — every `--state=empty` and `--state=long` invocation, on every route. The states existed and had never been photographed. | **fixed** — pass streams through by pathname (they carry `?token=`, so `url.endsWith` misses them) |

## P1 — AAA design

| #    | Finding                                                                                                                                                                                                                                                                                                                                                                                                    | Status                                                                                                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-1 | **The right rail had no width, so it resized with its own contents.** Measured 169px empty vs 323px loaded — and `DESIGN.md` §10.1 specifies `225px \| 1fr \| 300px`, so it had never been either. The loading skeleton already implemented the 300px track, so every feed load shifted the rail as content arrived.                                                                                       | **fixed** — `w-[300px] shrink-0`; measured 300px after                                                                                                                                               |
| P1-2 | **Two Arabic words rendered as one.** At the collapsed 169px width the rail header's `justify-between` had nothing left to distribute: `أشخاص قد تعرفهم` and `عرض الكل` met at a ~1px gap and read as `تعرفهمعرض`. Its sibling card escaped only because its title is shorter — the same markup, copy-pasted, so one copy looked fine and hid the other.                                                   | **fixed** — one `RailHeader` with `gap-2` + truncating title                                                                                                                                         |
| P1-3 | **The feed's empty state named two actions and offered neither.** Body reads "publish your first post, **or connect with people**". The composer sits directly above, so posting was reachable; discovery was not — and the rail that suggests people is `xl:`-only, so on a phone there was no path to another human from this screen at all. `EmptyState` has supported `cta`/`onAction` the whole time. | **fixed** — "Find people" → `/network`, verified navigating on both viewports                                                                                                                        |
| P1-4 | **The suggestions card answered its own empty state with `—`.** A bare em dash, one Surface above a jobs card that answers its empty state with a real link.                                                                                                                                                                                                                                               | **fixed** — links to `/network`, mirroring the jobs card                                                                                                                                             |
| P1-5 | **Web and mobile showed different feed empty states.** Mobile rendered a lone title ("Start by publishing your first post.") with no body and no action, under a different key path (`feed.empty` as a string vs web's `feed.noResults` + `feed.empty.feed`), so the parity gate counted both sides as platform-only and neither as drift.                                                                 | **fixed** — mobile now mirrors web's key paths, title, body and action                                                                                                                               |
| P1-6 | **The feed page never implemented the 3-column grid it loads into.** `loading.tsx` renders `xl:grid-cols-[225px_minmax(0,1fr)_300px]` at `max-w-[1128px]` per `DESIGN.md` §10.1, including a 225px left rail. `feed/page.tsx` renders a centred flex with a 520px column and **no left rail at all**. Skeleton→content therefore relayouts the whole page, not just the rail.                              | **fixed** — the prototype settled it: `FeedPage.jsx:199` is `225px 1fr 300px` with a mini-profile left rail, so the skeleton was right and the page had drifted. Measured `225px 507px 300px` after. |

| P1-7 | **The unread badge is invisible against its own button.** Mobile's bell fills with `accent600` when unread (`iconButtonActive`) and the count badge on top is `accent700` — measured **1.33:1**, where WCAG 1.4.11 wants 3:1 for a component boundary. The count _text_ is fine (7.70:1 white on `accent700`); it is the badge shape that vanishes. Same 1.34:1 in dark. | **fixed** — a 2px `surface` ring, the treatment the native `Avatar` gives its presence dot. Puts `surface` between the two reds: 5.79:1 vs the bell and 7.70:1 vs the badge in light, 4.29:1 and 3.21:1 in dark. Dot grew 20 → 24 because RN draws `borderWidth` inside the box. |
| P1-8 | **The mobile screenshot harness reported success on a screen the app had not drawn yet.** A cold run photographed the splash and the profile gate and printed `ok`, `direction verified` and `theme verified` over both. `warmUp` only proves "not blank" and says so; the documented safety net is the end-of-cell duplicate report, which cannot fire on a one-screen `--only=` run. | **fixed** (#154, verified 2026-08-28) — a cold start is blocked until React Native mounts. The gate was left open on the assumption that its real text would read as mounted; that assumption was wrong. Forced permanently on and dumped: the gate's hierarchy is **33 bytes with no package and no resource-ids**, so `appMounted()` returns false and the guard blocks the shot. |

## P2 — cleanup

| #    | Finding                                                                                                                                                                                                                                                                                                                                                                                                             | Status                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| P2-1 | `feed/page.tsx` crossed the 300 LOC `qa:design` ceiling. `FeedErrorState` was a local component in a directory whose convention is one file per sub-component (`OnboardingDoneCard`, `ProfileCompletenessCard`).                                                                                                                                                                                                    | **fixed** — extracted to `feed/FeedErrorState.tsx`; `RetryChip` import was left dead by the move and removed |
| P2-2 | The i18n ratchet moved **down**: web 163→153 platform-only keys, mobile 100→99. Ten of those closed by declaring `feed.rail` web-only — the rail is `xl:` chrome with no phone twin — rather than by adding keys.                                                                                                                                                                                                   | **fixed** — ceilings lowered to match                                                                        |
| P2-3 | **Mobile was audited at source level only.** No emulator booted this pass: `adb` is not on `PATH` (it lives at `%LOCALAPPDATA%\Android\Sdk\platform-tools`), AVD `Pixel_7_Pro` was not running, and a native build is too slow for a 10-minute cycle. Mobile changes are covered by `feed-empty.test.tsx` (verified failing when the CTA is removed) but have not been photographed.                                | **closed** — booted and photographed; feed renders correctly on device                                       |
| P2-4 | English mobile top nav looked like it clipped "Me" at 390px. **Not a defect, and not English-only:** the nav strip is deliberately `overflow-x: auto` (`scrollWidth` 770 vs `clientWidth` 290), and both locales overflow it — English pushes 6 items past the edge, Arabic 4. The items are reachable by scrolling, and the page body never scrolls, which is why the harness reported 0 horizontal-overflow hits. | **closed — measured, no change**                                                                             |

## Iteration 4 — the `empty` and `error` sweep

All 33 routes photographed in `empty`, and the core routes in `error` — both
states unreachable before P0-1 was fixed. Four defects, one deferral.

| #     | Finding                                                                                                                                                                                                                                                                                                                                                     | Status                                                                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-9  | **A company over its job quota was told nothing.** Billing rendered `{used} of {limit}` in plain ink whatever the numbers, so at-or-over-quota looked like having room, and the consequence only arrived as a `402` after the employer had written the whole job. Reachable normally: a subscription that ends reverts the plan while its jobs stay active. | **fixed** (#157) — `text-warning` at the quota, plus one line naming the two ways out                                                                |
| P1-10 | **`me/edit` rendered a literal "…" as the whole page and stayed there.** One branch covered loading and failure, and `refresh()` had no `catch`, so a failed profile load stranded the reader with no message and no retry. `/me` falls back here when it cannot resolve a handle, so one failing request funnelled people into it.                         | **fixed** (#158) — skeleton for loading, danger `Alert` + retry for failure                                                                          |
| P1-11 | **`network` said the reader's network was empty when the server had failed.** `try/finally` with no `catch`: `items` stayed `[]` and the empty state rendered. Confidently wrong — nothing to retry, no sign anything broke.                                                                                                                                | **fixed** (#159) — error branch ahead of the empty branch                                                                                            |
| P1-12 | **`messages` said "no conversations yet" on a failed room list.** Same missing `catch`. The hook's existing `error` belongs to the open thread and renders in `RoomView`, which is not on screen at all on a phone, so a room-_list_ failure had nowhere to go.                                                                                             | **fixed** (#160) — a separate `roomsError` in the inbox pane                                                                                         |
| P1-13 | **A job that failed to load and a job that is gone rendered identically.** `if (error \|\| !job)` gave both one sentence and a link back, on both platforms, so a transient 500 cost the reader the page while every list route offers a retry.                                                                                                             | **fixed** (#163) — `NOT_FOUND` leaves `error` null and keeps the neutral copy; only the failure branch carries a retry; the link back stays for both |

**The pattern worth naming:** P1-10, P1-11 and P1-12 are one shape — an unhandled
read rejection collapsing into an empty state — and in all three the mobile twin
already caught correctly. The lockstep rule found these in reverse: mobile was
the reference and web had drifted.

**A trap that cost real time:** naming a translator as an effect dependency.
`useTranslations` is memoized in the app, but the test provider returns a fresh
function per render, so the effect re-ran forever and hung three tests on a
timeout. Read it through a ref — and assign that ref inside an effect, because
touching `ref.current` during render is a lint error here.

## Iteration 5–6 — the `long` sweep, and P1-13 closed

| #     | Finding                                                                                                                                                                                                                                                                                                                          | Status                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P1-14 | **A job title with no spaces scrolled the whole page sideways.** `/activity`'s suggested-job cards are grid items, and a grid item defaults to `min-width: auto` — it will not shrink below its content, so an unbreakable title widened its track, its card and the document: `scrollWidth` 414 against a `clientWidth` of 390. | **fixed** (#162) — `min-w-0` on the `<li>`, `break-words` on the two lines |

Found by the harness's own horizontal-overflow detector rather than by eye, and
that detector is the check: the route now reports `0 hits` and an empty
`_overflow__long.json` where it listed this card before. The other 11 routes in
the `long` sweep were clean — they truncate with an ellipsis or wrap correctly.

## Checked and _not_ filed

Recording these so the next pass does not re-litigate them:

- **`EmptyState`'s CTA is not a 36px hit target.** The visual box is 36px, which is
  under CLAUDE.md's 40px web / 44pt mobile floor — but `Button` carries
  `target-area`, a `::before` that expands the _pressable_ box without moving
  layout. Measured `min-height`/`min-width` on the pseudo-element: **44px each**.
  `boundingBox()` measures the wrong thing here.
- **The rail header collision is not present with data.** Measured at 123px gap on
  a loaded feed. It only appears in the state the harness could not photograph
  until P0-1 was fixed, which is why it survived every previous visual pass.

- **The English mobile nav does not clip.** It looked like it truncated "Me" at
  390px. The strip is `overflow-x: auto` — `scrollWidth` 770 against a
  `clientWidth` of 290 — so the items past the edge are scrolled to, not lost,
  and the page body itself never scrolls. Both locales overflow it (English 6
  items, Arabic 4), so the original "English-only" framing was wrong twice over.

- **The Karama balance is not a broken glyph.** It renders as a small dot, which
  is Arabic-Indic zero (`٠`). The `٥٠٠٠` ceiling beside it draws its zeros the
  same way. Reading the script correctly, not measuring, settled this one.
- **The profile tab strip does not clip `النشاط`.** Measured `overflow-x: auto`,
  `scrollWidth` 362 against a `clientWidth` of 300 — it scrolls, exactly like the
  top nav in P2-4. Two screenshots, same wrong conclusion, same measurement.
- **The employer job limit is enforced.** "٢ من ١" on the billing screen looks
  like a paywall that does not hold. Posting a third job against that company
  answers `402 Active job limit reached (2/1)`; the seed created its jobs through
  Prisma rather than the service. P1-9 above is the display half only.
- **The search result headline does not escape its card.** In a contact sheet the
  long Latin headline looked like it ran past the card's rounded border. Measured:
  `escapesCard: false`, its right edge 85px _inside_ the card, no truncation, and
  the page reports no horizontal overflow. The border in the crop belonged to a
  neighbouring element.
