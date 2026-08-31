# Mobile redesign — 2026-08

Source: the 28-artboard canvas `Baydar Mobile Redesign.dc.html` plus its
`handoff/` folder (component specs, token delta, i18n additions). The canvas is
not in the repo; it came in as a zip and lives with the designer.

The redesign's whole thesis, in the brief's own words: the app _was_ correct and
tokenised, but it looked like a token test — every block a white card at one
elevation, and the three things that make Baydar not a LinkedIn clone
(explainable ranking, decomposed job fit, the Karama ledger) were text, not
form.

Five moves carry it:

1. **Olive ink band** — chrome moves from a white bar to a brand band.
2. **Alternating bands, not a card stack** — elevation is spent only where a
   record is a record.
3. **Ruled bars as the one numeric device** — fit, Karama and completion all
   render as the same bar. A score never appears bare.
4. **Provenance line on every ranked surface** — why this is in your round.
5. **A finite round with a real end** — counted at the top, closed at the bottom.

---

## What landed (native)

### Tokens — `packages/ui-tokens`

Three new colour groups plus two non-colour groups, both themes, all generated
through to `tokens.css` and the Tailwind preset:

| Group                | Keys                                                      | Purpose                                   |
| -------------------- | --------------------------------------------------------- | ----------------------------------------- |
| `color.band`         | `DEFAULT` `on` `onMuted` `hairline`                       | the olive chrome band                     |
| `color.surface.band` | (6th surface variant)                                     | tinted **full-bleed** section, not a card |
| `color.bar`          | `track` `fill` `fillWeak` `onBandTrack` `onBandFill`      | the numeric device. Never `danger`        |
| `color.rule`         | `hairline` `strong`                                       | section rules — two weights, no third     |
| `control`            | `barHeight` `barHeightLarge` `railNode` `railNodeCurrent` |                                           |
| `chrome`             | `bandPaddingTop` `bandPaddingBottom`                      |                                           |

`scripts/build-tokens.mjs` had a hard-coded push list (`brand`, `accent`, `ink`,
`surface`, `line`, semantics) so the three new groups would have been silently
dropped from the CSS. Three lines added; `check:tokens` is green.

### Components — four new, in **both** packages

Built native-first, but CLAUDE.md's lockstep rule and
`scripts/check-ui-lockstep.mjs` both require the twin in the same commit, so
`ui-web` has all four too. 49 paired components, 0 drift.

| Component        | Rule it enforces                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `AppBand`        | one band per screen, never scrolled away, **no shadow** — separated by colour, not elevation |
| `ProvenanceLine` | a ranked list says so; states the _mechanism_, never the benefit                             |
| `ScoreBar`       | never bare, never red, one bar for every score in the app                                    |
| `StepRail`       | four steps, one vocabulary; `terminal="closed"` must be paired with a sentence               |

`AppHeader` gained an optional `tone` prop (`"surface" | "band"`), defaulting to
`"surface"` so every existing call site and snapshot is unchanged.

Tests: 35 native + 24 web, all from the specs' own test lists.

### Screens

- **All 17** `AppHeader` call sites → `AppBand`, plus `FeedTopBar`. Each screen
  drops `top` from its `SafeAreaView` edges (the band owns the inset now) and
  sets `StatusBar barStyle="light-content"`.
- **Feed** — round counted in the band, `ProvenanceLine` under the chrome, and
  the real end-state (`وصلت إلى نهاية الجديد` + the round count) as the list
  footer when `hasMore` is false.
- **Search** — `ProvenanceLine` with the viewer's city and the result count.
- **Karama** — balance is now a `ScoreBar` in the band (`onBand`, `size="lg"`,
  `display="ratio"` against the cap). The old tinted balance card is gone.
- **Profile edit** — completion `ScoreBar` in the band.
- **Job detail** — `ApplicationRail`, a `StepRail` driven by the
  `viewer.applicationStatus` the DTO already carries. It absorbed `JobOutcome`,
  because StepRail rule 2 says a closed rail must carry the sentence explaining
  it — the pairing is now structural.
- **Settings** — the ranking is a setting: explanation switch, round size, and a
  real off switch, persisted through `src/lib/ranking.ts` (mirrors `theme.ts`).

---

## Not built, and why

Nothing here is a design disagreement — each needs surface the API does not have.

| Artboard                                 | Blocked on                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `1b` `1c` `5a` `6a` — decomposed job fit | **No fit score exists.** `Job` carries no score field and there is no endpoint that decomposes one by weight. `packages/shared/src/palestine.ts` has a proximity score for server-side ranking; nothing surfaces it per job.         |
| `5c` — طلباتي (applications list)        | **No endpoint.** The API has no "my applications" route; `applicationStatus` is only reachable per-job.                                                                                                                              |
| `5f` — نشر وظيفة wizard                  | Needs the inline wage-guard validation contract.                                                                                                                                                                                     |
| `3b` — network suggestions               | **No suggestions surface.** The screen's tabs are invitations / connections / sent, all chronological. ProvenanceLine rule 1 is "if a list is ranked, it says so" — these are not ranked, so a provenance line there would be a lie. |
| `7e` — الأمان                            | The design's `security.*` block **duplicates** strings the app already ships under `settings.security.*`. Reconcile, don't merge.                                                                                                    |

207 of the handoff's 238 proposed strings are parked in
`docs/design/mobile-redesign-parked-strings.json` — they belong to the screens
above. `scripts/check-i18n-parity.mjs` fails on unreferenced keys, and dead
strings drift. Merge each namespace back in the commit that builds its screen.

### Copy the handoff wanted to change, and did not

The additions collided with ten existing strings. Per the handoff's own rule
("nothing here overwrites an existing string") the repo's copy was kept. Four
are worth a designer's second look, because the repo's line is the better one:

| Key                  | Kept                                        | Design proposed                 |
| -------------------- | ------------------------------------------- | ------------------------------- |
| `karama.title`       | السمعة بتنكسب                               | كرامة                           |
| `composer.title`     | ماذا يدور في بالك؟                          | منشور جديد                      |
| `search.placeholder` | …ابحث عن أشخاص أو منشورات أو وظائف أو شركات | ابحث عن أشخاص أو وظائف أو شركات |
| `saved.remove`       | إزالة من المحفوظات                          | إزالة                           |

(`activity.metrics.requests` / `.jobs` differ only by English capitalisation —
the design's lowercase is a typo, not a decision.)

---

## §web — the same design on web

The four components already exist in `ui-web` and the tokens already reach
Tailwind (`bg-band`, `text-band-on`, `bg-bar-fill-weak`, `border-rule-hairline`,
`bg-surface-band`). What is left is screens.

**Definition of done:** `MAX_PLATFORM_ONLY_KEYS.mobile` in
`scripts/check-i18n-parity.mjs` drops back from 115 to 99. Those 16 keys are the
exact web debt this redesign created.

### Phase 1 — strings (blocks everything else)

Add the 16 twins to `apps/web/messages/{ar-PS,en}.json`: `feed.round.*`,
`feed.provenance.*`, `feed.end.*`, `search.provenance`, `search.resultCount`,
`applications.steps.*`, `applications.closedNote`, `karama.unit`,
`profileEdit.completion.label`, `settings.explainRanking`,
`settings.roundSize`, `settings.rankingOff`.

Land these **with** Phase 2, not before — the parity check fails on unreferenced
keys on web exactly as it does on mobile.

### Phase 2 — the four surfaces that already have their data

Mirrors of what native just shipped, in dependency order:

1. `(app)/feed/page.tsx` — round count, `ProvenanceLine`, real end-state.
2. `(app)/search/page.tsx` — `ProvenanceLine` with city + result count.
3. `(app)/me/karama/page.tsx` — balance `ScoreBar`.
4. `(app)/me/edit/page.tsx` — completion `ScoreBar`.
5. `(app)/jobs/[id]/page.tsx` — `StepRail` from `viewer.applicationStatus`.
   Note `JobOutcome`'s old comment: web has this block inline, so it needs the
   same fold native just did.
6. `settings` — the ranking prefs. Web has no `src/lib/ranking.ts` twin;
   `localStorage` via the existing settings pattern, not SecureStore.

### Phase 3 — the band, which is the one real divergence

**Do not** paste `AppBand` on top of every web page. Web's chrome is `AppShell`
— a persistent sidebar and top nav — not a per-screen header. Native has one
band per screen because native has no persistent chrome; web already has the
identity `AppBand` was invented to carry.

Two candidate readings, and this is a **designer decision, not an
implementation one**:

- **(a) `AppShell` goes olive.** The nav bar becomes the band; pages keep plain
  headings. Closest to the artboards' _intent_ (chrome carries identity), one
  change, no per-page work.
- **(b) `AppBand` per page, under the shell.** Closest to the artboards'
  _appearance_, but stacks two chromes and eats vertical space on a 1280px
  viewport where the artboards were drawn for 390px.

`AppBand` is built and exported either way — (a) reuses its tokens, (b) reuses
the component.

### Phase 4 — alternating bands

Move 2 (paper rows and tinted full-bleed bands trading off down the column) is
the least mechanical part and the one that needs the most judgement at desktop
width. `surface.band` is tokenised and the CSS var ships; the layout call is
open. Web's feed is three columns — the artboards are one. Do not assume the
rhythm transfers.

### What web must NOT copy

- The per-post provenance line in artboard `1a`. The component spec's rule 4 is
  "one per surface, directly under the chrome, above the first item," and there
  is no per-post ranking reason in the API to render anyway.
- `accent500` more than once per screen. The band takes the chrome; terracotta
  is reserved for the single commit action. The token delta suggests an eslint
  rule for this; it does not exist yet on either platform.

---

## Gates

Green at the time of writing: `check:tokens`, `check-ui-lockstep`,
`check-i18n-parity`, `check-release-placeholders`, `qa:design`, `turbo lint`
(0 errors), `turbo type-check` (13/13), `turbo test` (853 tests, 12/12).

`qa-design.mjs` gained a `dataFileAllowlist` for the two token tables. The
300-LOC cap is aimed at screens and services; a flat list of design values gets
longer every time the system gains a token, and splitting it would put the
source of truth in two files — which `tokens.native.ts` says outright is a bug.
