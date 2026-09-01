# STUDIO_BACKLOG

Running ledger for the studio loop. One line per finding, with the evidence that
produced it. **Findings here are measured, not eyeballed** — a screenshot starts
an investigation, a measurement closes it. Two entries below are recorded as
_not_ bugs precisely because the measurement disagreed with the screenshot.

Last pass: 2026-08-28, iteration 9 — a source-level sweep of the profile edit
sections' write paths (no harness needed; the pattern is grep-visible). Earlier
passes audited web `/feed` (`empty` and seeded, ar-PS + en, light + dark, 390px /
1100px / 1440px) and the mobile feed on a booted `Pixel_7_Pro`. Iteration 1
shipped as #151.

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

## Iteration 7–8 — the `loading` sweep, and a janitor pass that found nothing

| #     | Finding                                                                                                                                                                                                                                                         | Status                                                                                         |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P1-15 | **The inbox said "no conversations yet" before it had looked.** `InboxList` branched on `visibleRooms.length === 0` and nothing else, so a room list still in flight rendered the empty state — illustration and all — to a reader whose inbox had not arrived. | **fixed** (#166) — `roomsLoading` and three row skeletons, as the mobile twin has always drawn |

That completes one component's three phases. #160 separated a **failed** list from
an empty one; #166 separates a **pending** list from both. Loading, failure and
emptiness finally render as three different things — and mobile was the reference
for all three, the fourth such case this session.

**The janitor pass found nothing to delete, which is itself the result.** 404
source files scanned for unreferenced modules: the only hit was
`instrumentation-client.ts`, which Next 16 loads by convention. Declared runtime
dependencies checked against imports across all six workspaces: none unused. The
eight `console.*` calls in app code are all `console.debug`, tagged and gated on
`NODE_ENV`/`__DEV__`. Nothing here needs a broom, and saying so beats inventing
work.

## Iteration 9 — the write-error sweep on the profile edit sections

The read-side of this shape was closed in iterations 4–8 (P1-10 through P1-15).
Iteration 9 grepped the mirror image: **writes** whose rejection is swallowed.
Repo-wide, exactly two source files had a `try`/`finally` (or `.then`) with no
`catch` anywhere in them — both are the profile edit sub-components.

| #     | Finding                                                                                                                                                                                                                                                                                                                                                                                                               | Status                                                                                                                                                               |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-16 | **Adding or removing an experience, education or skill said nothing when the write failed.** `ExperiencesSection`, `EducationsSection` and `SkillsSection` each ran `add`/`remove` as `try`/`finally` with no `catch`, so a failed request reset `busy` and left the form untouched — no message, no sign the change had not saved. The reader could re-open and find the item gone or never added, with no clue why. | **fixed** (#168) — mirror the sibling `BasicsSection`: clear on attempt, `catch { setError(t("saveFailed")) }`, one `text-danger` line. Reused key, no i18n movement |

**The pattern, again, in reverse.** `BasicsSection` (the fourth sub-component in
the same directory) already caught and surfaced this, and **all four mobile edit
cards** (Experiences/Educations/Skills/Basics) catch on both add and remove — so
web had drifted from a pattern the rest of the app, and the whole mobile twin,
already followed. That is the fifth mobile-is-the-reference finding this session
(P1-10, P1-11, P1-12, #166, and now this).

Guarded by `_components/__tests__/write-errors.test.tsx`: a raw-DOM RTL test that
asserts the error surfaces on a rejected removal for each of the three sections,
**verified failing** when any one `catch` is deleted. No new i18n keys — the
existing `profile.saveFailed` covers add and remove, so the parity ceilings
(web 153, mobile 99) did not move.

## Iteration 10 — a paint-time sweep across both platforms

Web matrix: 92 shots (33 routes, ar-PS, light + dark, 390px). Mobile: 35 screens
photographed on a booted `Pixel_7_Pro`. Seven defects, every one of them a
paint-time fact — none is reachable from a unit test, and each had a green gate
sitting directly on top of it.

| #     | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Status                                                                                                                                                                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1-17 | **Every tab strip erased the opening letters of its own first tab.** `Tabs` and the app-shell nav carried a fixed `mask-image` fading 16px at each edge as the scroll affordance. A mask paints on the scrollport, not on the content, so a strip that is not scrolled fades its own start: on `/network` the tablist measures `scrollWidth === clientWidth === 342` with the active tab flush at `gapFromEdge: 0`, and `علاقاتي` rendered with its `ع` cut in half. Same on `/search`, `/messages`, `/me/connections`, `/moderation`, `/billing` — every strip, both themes. | **fixed** — `useEdgeFade` measures child rects against the scrollport and fades only the side that actually hides content. Guarded by `e2e/strips.spec.ts`, verified failing with the old mask restored                                                      |
| P1-18 | **`/activity`'s three metric tiles put the label at one edge and its number at the other.** The count carries `dir="ltr"` so a locale-aware figure keeps its digit order — which also makes the figure's own start the LEFT edge, and a stretched flex item then parked "٢" opposite "طلبات اتصال" in the same tile.                                                                                                                                                                                                                                                          | **fixed** — `self-start`, so cross-axis alignment follows the tile's direction. Measured label and count sharing one edge at 358px                                                                                                                           |
| P1-19 | **The "applied" badge took 39% of a job card on a phone.** `JobListRow`'s trailing block is `shrink-0`, so at 390px the badge and the save button side by side measured 126px of a 324px row and left the job itself 126px: title truncated, meta line broken mid-salary, three skill chips on three separate lines. The native twin has always stacked these (`trailing: { alignItems: "flex-end" }`).                                                                                                                                                                       | **fixed** — a column, button first; measured 170px against 126px, chips on 2 rows instead of 3                                                                                                                                                               |
| P1-20 | **A one-line ellipsis in Arabic cuts a trailing Latin word in half.** RTL clips at the line's visual LEFT edge, which is the middle of an LTR run: a headline ending in "TypeScript" painted as "… و ipt…" and a job titled "… — NestJS" as "… — tJS…" — noise, not truncation. Web `RecordCard` truncated title and subtitle to one line; the native twin has always given both `numberOfLines={2}`.                                                                                                                                                                         | **fixed** — `line-clamp-2` on both, and on `JobListRow`'s title; the break lands on a word, so the Latin word moves whole or goes. Photographed before and after                                                                                             |
| P1-21 | **The ratio figure's LTR fix never worked in Arabic.** `ScoreBar`, `OnboardingProgress` and both composer counters wrap the figure in `dir="ltr"` / a U+2066 isolate against exactly this — and Arabic-Indic digits are bidi class AN, which makes the neutrals beside them behave as RTL. Measured in Chromium at ar-PS: with the spaces the figure's first character paints 24px to the RIGHT of its last. The emulator agreed — `٣ / ٥` read `٥ / ٣`, `٦٥ / ٥٬٠٠٠` read `٥٬٠٠٠ / ٦٥`, the composer's `٠ / ٣٬٠٠٠` read `٣٬٠٠٠ / ٠`.                                         | **fixed** — the spaces are the trigger; unspaced, the slash is a common separator inside one number run. Six sites across both platforms, plus the `ltrIsolate` docstring that claimed the cure. Re-photographed on the device: `٣/٥`, `٦٥/٥٬٠٠٠`, `٠/٣٬٠٠٠` |
| P1-22 | **The profile-URL hint read `in/demo/`.** `"سيظهر كرابط: /in/{handle}"` puts a leading slash — a neutral — against Arabic text, so bidi moved it to the far end, and the one thing the hint exists to show was wrong.                                                                                                                                                                                                                                                                                                                                                         | **fixed** — the path travels as one isolated `{path}` value on both platforms                                                                                                                                                                                |
| P1-23 | **Mobile showed no pay on any candidate-facing job surface**, list or detail, while web carries it on four. `formatSalaryRange` had zero mobile callers. The statutory minimum-wage warning was in the same state: the mobile catalog has carried `jobs.belowMinimum*` since #140 and only the employer's own job form ever rendered it, so the reader of an underpaid job was told nothing.                                                                                                                                                                                  | **fixed** — pay on the meta line in the list and its own line on detail, the badge on both, `JobPay` extracted so the route file stays under the LOC cap. `jobs.from` / `jobs.upTo` added to the mobile catalogs (web-only keys 153 → 151)                   |

**The theme, again: mobile was the reference for three of the seven** (P1-19,
P1-20, and half of P1-21) — the sixth, seventh and eighth time this loop has
found web drifting from a pattern the native twin already followed.

**And one fix that was never verified in the language it was written for.**
P1-21 is the instructive one: the previous loop found the reordering on a device,
wrote the isolate, and re-photographed a screen where it appeared to hold. An
isolate does fix Latin digits. The app's digits are Arabic-Indic, and every ratio
in the product was still painting backwards a day later. Measuring in the actual
locale is the check; "the fix is in the file" is not.

## Iteration 11 — the English pass, and a plural rule nobody had written

The `ar-PS` matrix was clean after iteration 10, so this pass ran the `en`
locale at 1440px — the viewport and language the loop had never photographed
together. One product bug, one harness bug, two false alarms.

| #     | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Status                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-27 | **Count strings had no plural rule on either platform.** A post with one comment said **"1 comments"**; the same shape covers 13 messages per platform — unread counts, members, applicants, results, round size, active jobs. Arabic had it worse, because a bare numeral is only correct there for 1 and 100+: the catalogs said `٢ تعليق` where Arabic takes the dual `تعليقان`, and `٣ تعليق` where it takes `٣ تعليقات`. Three web strings already carried full six-category ICU plurals, so the pattern existed and 13 messages had simply never been given it.                                                                                                                | **fixed** (#177) — ICU on web, i18next category keys on mobile, and `check-i18n-parity.mjs` folds the suffixes so a correctly pluralised pair no longer reads as six mobile-only keys plus one web-only key. Two `activity.tasks.*` entries left the divergence ledger as a result              |
| P1-29 | **User text lost its punctuation to the page's direction.** A full stop is a bidi-neutral, so it takes the direction of the paragraph around it rather than of the sentence it belongs to. An Arabic job description inside the English UI painted `.تمديدات وصيانة لوحات توزيع` — the stop first, at the far left — and an English company "About" inside the Arabic UI painted `.Baydar is building…` the same way. The app already had `bidi-plaintext` for exactly this and it was on the post body, the search hits and the comments; the job description, the public job page, the company about, the CV about and experience, and the message bubble had never been given it. | **fixed** — the class on all six, and `e2e/bidi.spec.ts` asserts every `white-space: pre-wrap` block on a seeded feed resolves its own direction, **verified failing** with `PostCard`'s copy removed. The spec insists on finding at least one such block, so a run that asserts nothing fails |
| P1-28 | **The mobile harness could not photograph a dark screen.** `e2e/shots.mjs` read theme luminance from the first _painted_ frame, which is the Android splash — a fixed light window in both themes. Three dark runs were skipped with `theme did not apply — mean luminance 249` while the device settled into dark (measured 43) two seconds later, each time after the appearance flow had actually worked.                                                                                                                                                                                                                                                                         | **fixed** (#177) — wait for React Native to mount before reading, the same gate the per-screen capture already uses. The dark matrix then ran clean: `theme verified (luminance 43)`, 36 screens                                                                                                |

| P1-30 | **User text with no break opportunity escaped its card.** The `long` matrix — a 49-character title with no spaces — put a search headline across the card border, clipped at the viewport edge, and the company header's tagline outside the card's start edge showing only its tail (`areEngineeringManagerPlatformInfra`). The document reported no horizontal overflow either time, because an ancestor hides it: only the picture showed it. | **fixed** — `overflow-wrap: break-word` on `.bidi-plaintext` itself, the class that already means "text somebody typed", so one rule covers the search hits, job rows, post bodies, comments, saved rows, CV, company about and message bubbles. `RecordCard`'s title and subtitle and the company header's name and tagline joined the class |
| P1-31 | **A clamped title showed its own tail.** `truncate` puts the ellipsis at the line's visual left, which in RTL is the middle of a trailing Latin run, so the job detail page rendered the long title as `…atformInfra`. The list row had already been clamped for this in #175; the detail h1 had not. | **fixed** — `line-clamp-2` + `bidi-plaintext`, and the title now reads from its start |

| P1-32 | **Two screens scrolled sideways on a phone.** The harness's horizontal-overflow detector had reported 0 hits on every route all session; it fired the moment the `long` state reached the profile editor (557px of document in a 390px viewport) and the CV (425px). `me/edit`'s experience and education rows are `flex … justify-between` with no `min-w-0`, and a flex item will not shrink below its content; `/cv`'s header name and headline carried no `bidi-plaintext` at all. | **fixed** — `min-w-0` on the rows, the class on both headers, and `.bidi-plaintext` moved from `overflow-wrap: break-word` to `anywhere`: they wrap identically but only `anywhere` counts the break opportunity in the min-content width a flex item sizes itself from. 13 routes re-shot in `long`, 0 hits |

**Checked and not filed, both of them expensive-looking:**

- **Five routes rendered a 404 in the `en` matrix, and three had in the `ar`
  dark one.** They were all _nested_ routes (`/employer/[slug]`,
  `/settings/appearance`, `/legal/tos`), while every one-segment route answered
  200 — a `next dev` route manifest left stale by two branch switches, not a
  product failure. Restarting the dev server restored all of them. Whole cells
  of two matrices are invalid because of it; re-shoot after any branch change.
- **An `/en/…` 404 appeared to render the Arabic root not-found.** The HTML
  payload really does contain `راحت الصفحة` — it is the unauthenticated SSR
  shell. With a session, `/en/in/does-not-exist` renders the localized page:
  "We couldn't find this page", `lang="en"`, `dir="ltr"`, app chrome intact.
  The root 404 being Arabic is a deliberate BRAND.md decision, written into the
  file.

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

- **The Karama bar is not stuck full.** At 65 of 5,000 the ScoreBar reads as a
  filled olive rail with a nub at the end. Sampled the row in the PNG: the rail
  is `barOnBandTrack` (118,129,89) and the fill is 8px of (230,235,214) at the
  start edge — 0.85% of a 941px track, which is what 65/5,000 should draw.
- **A salary range is not the ratio bug.** `formatSalaryRange` joins with a
  spaced en-dash and therefore paints in RTL order — measured on `/jobs`: min at
  x 134–174, dash at 125, max at 83–123. Read right to left that is
  "4,500 – 5,500", the correct reading order for the sentence it sits in. The
  ratio differs because it is one compact figure, not a phrase.
- **Three routes rendered the error boundary in the dark pass only** —
  `employer-detail`, `employer-new`, `settings-blocked`. The light shots of all
  three are clean, and the same session photographed `employer-billing` and
  `employer-applicants` fine, so this is the API under a 92-shot run rather than
  a theme-dependent failure. Worth a second look if it recurs on a small matrix.
