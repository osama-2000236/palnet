# OPUS5 review — findings (2026-07-25)

Charter: [OPUS5-VISION-REVIEW-PROMPT.md](./OPUS5-VISION-REVIEW-PROMPT.md).
Branch `review/opus5-launch-readiness`, cut from `origin/main` @ `c72e9d6`.
Phase 0 ledger: [OPUS5-CLEANUP-2026-07-25.md](./OPUS5-CLEANUP-2026-07-25.md).

## Evidence base

|                 |                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------- |
| Web matrix      | 46 routes × {ar-PS, en} × {light, dark} × {1440×900, 390×844} = 368 PNGs                  |
| Mobile matrix   | 38 screens × {ar-PS, en} × {light, dark} = 152 PNGs                                       |
| Console capture | 32 web cells, aggregated by distinct message                                              |
| Overflow audit  | every route at 390px, both locales, measured not eyeballed                                |
| Static sweeps   | consumed i18n keys, dead handlers, hardcoded strings, physical CSS, viewer-scoped caching |

Harnesses: `apps/web/e2e/shots.mjs`, `apps/mobile/e2e/shots.mjs`. Both gitignore
their output; re-run instructions in `apps/mobile/.maestro/README.md`.

## The harness was lying, four ways

Worth leading with, because every one of these would have corrupted the review
and none of them failed loudly — a login screen, a spinner and a blank screen
are all "valid" renders.

| Defect                                                | Effect                                                                                                                                                                                                                                  | Fix                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Single login for the whole run                        | Access tokens live 15 min, the matrix takes ~1 h. **15 of 368 web shots were the sign-in page**, not the route under test. Found by hashing output: five unrelated routes in `en/light/mobile` shared one MD5, ten more shared another. | `2daca49` — mint sessions per context                          |
| Fixed 2.6 s settle on mobile                          | Employer job form captured mid-spinner: a bare "جارِ التحميل…" pill, 55 KB against a 180 KB real render                                                                                                                                 | `5ff3649` — `captureStable`, screencap twice and compare bytes |
| Blank screen is stable                                | Theme/locale switches restart the app; `captureStable` cannot tell "settled" from "hung blank". `feed__ar-PS__dark` was blank **and white inside the dark cell**                                                                        | `5f825cb` — explicit warm-up, cell fails loudly instead        |
| Overflow measured after `screenshot({fullPage:true})` | That call resizes the viewport internally, so the measurement read the resized layout                                                                                                                                                   | `c588df1` + `02c7c05` — measure before shooting                |

`shots.mjs` had the single-login design during the **2026-07-23 vision pass** too,
so part of what that pass reviewed was probably the login page.

## P0

None found.

## P1 — closed

| id   | Finding                                                                                                                                                                                                                              | Evidence                                                                            | Fix                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------- |
| P1-1 | Hydration mismatch on **every page**, all 32 cells, every locale/theme/auth context. Server sends `nonce="h4Dk+…"`, client reads `nonce=""` — browsers strip the attribute once CSP is applied. React declares the tree unpatchable. | React diff naming both inline boot scripts                                          | `829215b`            |
| P1-2 | Every relative timestamp in the mobile app was ungrammatical Arabic. Hermes has no `Intl.RelativeTimeFormat`, so a hand-rolled `${count} ${noun}` branch ran: "قبل ٣ يوم" — plural count, singular noun. **Fixed twice, see below.** | device screenshot; output matched the old fallback template character for character | `f0e0db0`, `c885fec` |
| P1-3 | `messaging.connectionLost` / `connectionFailed` missing from **both** catalogs. `useRoomMessages` binds `messaging` and passes `translate: (m) => t(m)`, so an SSE drop rendered the raw key path in Arabic _and_ English.           | `IntlError` in the live console capture, then traced through the hook chain         | `4355338`            |
| P1-4 | 404 page's two recovery buttons rendered key paths — `common.home` and `common.search` existed in neither catalog.                                                                                                                   | catalog diff                                                                        | `4355338`            |
| P1-5 | `/me/edit` rendered 526px of content in a 390px viewport. `flex-1` on an `<input>`: flex items default to `min-width:auto` and an input will not shrink below ~200px. Two instances (skills adder, comment composer).                | measured `scrollWidth`/`clientWidth` + named element                                | `02c7c05`            |

### P1-2 took two attempts, and the first one was worse

Recorded because the failure mode is instructive: the first fix reasoned from
an assumption instead of checking it.

`f0e0db0` degraded to an absolute date whenever `Intl.RelativeTimeFormat` was
missing, on the argument that correct Arabic would need 42 hand-written strings
and a native-speaker review. That fixed the grammar and broke something bigger —
it applied to _every_ timestamp, so a five-minute-old post rendered `٢٥/٠٧/٢٠٢٦`
on mobile while web said `قبل ٥ دقائق`. A feed stamped with today's date
everywhere is worse than slightly wrong grammar, and it opened a web/mobile
divergence in a repo whose hard rule is lockstep.

The assumption was also false. Hermes has `Intl.PluralRules` — `apps/mobile`
already imports `intl-pluralrules` at `src/i18n/index.ts:4` — and that is the
hard part of Arabic. A two-line check would have shown it.

`c885fec` formats relative time properly on the fallback path using CLDR's own
forms, transcribed from `Intl.RelativeTimeFormat(numeric:"auto")` output,
including the idiomatic أمس / أول أمس that drop the numeral. Mobile and web now
produce byte-identical strings on every bucket.

The table is not trusted on assertion: the spec runs the same instants through
the real formatter and the fallback and requires identical output across 14 age
buckets covering every Arabic plural boundary, in both locales. Breaking one
entry (`day:few` أيام → يوم) fails it — verified, so the test is sensitive
rather than vacuous.

## P2 — closed

| id   | Finding                                                                                                                                                                                                                                             | Fix       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| P2-1 | `/legal/terms` was a byte-identical orphan of `/legal/tos` (same index blob, both `kind="tos"`; `LegalKind` has no `terms`). Nothing linked it — the footer points at `/legal/tos` — but `next.config.mjs` permanently redirected `/terms` into it. | `4f15867` |
| P2-2 | `PremiumCheckout.tsx`, 211 lines, never imported. Bound `useTranslations("premium.checkout")`, a namespace that does not exist; its 22 keys live under `billing.checkout`, which the mobile twin uses correctly.                                    | `4355338` |
| P2-3 | `aria-label="Loading"` hardcoded on both loading boundaries — Arabic screen-reader users heard English. `common.loading` already existed.                                                                                                           | `02c7c05` |
| P2-4 | `GET /companies/:id/jobs` keys on company id, not slug; passing a slug 403s with "Not a member of this company", which reads like a permissions problem. Cost the mobile harness a whole screen.                                                    | `40cd771` |
| P2-5 | Appearance screen never passed per-item `testID`s to `SegmentedControl` though the component always supported them. Labels are translated, so nothing could drive the locale switch deterministically.                                              | `dcb6a66` |
| P2-6 | Three unused API devDependencies (`source-map-support`, `ts-loader`, `tsconfig-paths`) — nest uses the tsc builder, jest uses `moduleNameMapper`.                                                                                                   | `f914032` |

## P2 / P3 — remaining

| id   | Finding                                                                                                                                                                                                                                                                                                                         | Why left                                                                                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-7 | **Closed** (`77168ee`). Expo Router warned on every launch that `_message-thread/useTypingIndicator` and `_premium/parts` were declared routes that do not exist. Both lacked the default-null export their 50 colocated siblings carry. Zero warnings on device now.                                                           | Structural residue stays: 52 colocated components live under `app/`, each needing a fake default export so the router does not claim it. The real fix is moving them to `src/` — a 52-file change, out of scope here. |
| P3-1 | Mixed Arabic register on the landing page — colloquial Levantine ("مين يلاقيك", "مش مطاردة الانتشار") beside MSA elsewhere.                                                                                                                                                                                                     | Editorial. Belongs to the native-speaker copy review already in `BLOCKED`.                                                                                                                                            |
| P3-2 | QA fixture leakage: 10 companies in the local DB, 8 are prior-run debris (`shots-billing-*`, `qadis-tech-*` ×3, `nimbus-co-*`). `qa:cleanup` is not being run.                                                                                                                                                                  | Local dev data only; never ships.                                                                                                                                                                                     |
| P3-3 | **Closed** (`77168ee`). `apps/mobile/expo-env.d.ts` oscillated: Expo writes it without a trailing newline on every `expo start`, prettier adds one back, so `format:check` went red depending on who ran last — it broke three times during this review. Now in `.prettierignore`; Expo owns the file, as its own comment says. | I first concluded "leave it open" after verifying that untracking breaks `type-check`. That was the wrong fix examined; one line in `.prettierignore` was never tried.                                                |

## Clean results

Recorded because "we looked and found nothing" is a finding.

- **Dead handlers: zero.** Every optional handler prop in `ui-web`/`ui-native` is guarded before its control renders. The `PostCard` `onRepost`/`onShare` class that motivated this check is genuinely closed.
- **Hardcoded English: zero**, after P2-3.
- **RTL physical properties: zero.** The only two `text-align` declarations are the deliberate `bidi-plaintext` utility, correctly scoped by `[dir="rtl"]` / `[dir="ltr"]` — the right way to pin alignment when `unicode-bidi: plaintext` breaks `text-align: start`.
- **Viewer-scoped caching: clean.** Both `public` cache headers sit on payloads that structurally cannot carry viewer state — `PublicJob` via `Job.omit({viewer:true})`, and `viewerRole` lives on `CompanySummary`, not the `CompanyDto` that `GET /companies/:idOrSlug` returns.
- **Horizontal overflow at 390px: zero** across all 46 routes × both locales, after P1-5.
- **Mobile i18n: clean** across 513 distinct keys at 748 call sites.
- **Landing page** is genuinely well built — brand mark, hero, disciplined olive/terracotta, correct RTL, legal footer. Called out because the rest of this document is defects.

## Regression coverage added

| Test                                                                                        | Catches                                                                                            |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/__tests__/messages-parity.test.ts` — "every key the code asks for exists" | keys missing from **both** catalogs, which key-set parity structurally cannot see                  |
| `apps/mobile/src/__tests__/i18n-parity.test.ts` — same check                                | ditto, 513 keys                                                                                    |
| `packages/shared/src/format.spec.ts` — "matches Intl.RelativeTimeFormat exactly"            | P1-2, and any drift in the transcribed CLDR table. Replaced a test that asserted the broken output |
| `apps/web/e2e/shots.mjs` — `_overflow.json`                                                 | P1-5 and any future 390px overflow, on every route, every run                                      |

Honest limit: the static key check cannot see dynamic keys — `t(message)` with a
runtime value, which is P1-3 itself. The harness console-error sweep is the net
for those, and it is what caught it.

## Rubric

The charter asks for philosophy / hierarchy / detail / functionality / restraint
scored 1–10 on all 85 screens. Not done, and not padded with numbers that were
never derived: scoring 85 screens × 5 dimensions is a judgement pass over 520
images, and this run spent its time on defects that are demonstrable instead.
What was reviewed by eye is recorded above with evidence; what was not, is not
claimed. The harnesses make the scoring pass cheap for whoever runs it next —
that was the point of building them.
