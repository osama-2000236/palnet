# Baydar — Web + Mobile Redesign Specification

## The design system delta for the LinkedIn-parity build

**Version:** 1.0 · **Date:** 8 August 2026 · **Companion to:** `BAYDAR-LINKEDIN-PARITY-MASTER-SPEC.docx`
**Authority:** `DESIGN.md` remains the design authority. This document is an **amendment** to it, not a replacement. Where this document adds a token, a surface, a component or a screen, `DESIGN.md` must be edited in the same commit so it stays the single source of truth. Where this document conflicts with `docs/design/RTL.md`, RTL wins.

---

## A. What this redesign is, and is not

**Is:** the specification for extending an existing, healthy design system to carry roughly 62 new components and 65 new screens without the system rotting. The scan (§1.5 of the master spec) found a design system in unusually good health — `check:ui-lockstep` at zero drift, tokens genuinely generated and gate-enforced, every one-platform component carrying a written reason. **Preserving that condition is a hard requirement of this work**, not an aspiration.

**Is not:** a visual refresh. The olive-and-terracotta palette, the warm surfaces, the IBM Plex Sans Arabic / Noto Naskh Arabic pairing, the eight-step type scale, the 4px space scale, the five surface variants and the seven-element signature composition all stay. `CLAUDE.md` forbids Tailwind blue, forbids dark mode without approval, and forbids recreating LinkedIn's UI. All three hold.

**The one visual change** in the whole document is the semantic-colour contrast fix in §B.1, and it is a defect repair rather than a redesign.

---

## B. Token deltas

### B.1 Fix `success` and `info` — inherited defect

Audit A6 tuned every light semantic to ~4.5:1 against its own translucent tint **over white only**. Measured against the warm surfaces that actually exist:

| Token     | on `white` | on `muted` | on `subtle` | on `sunken` |
| --------- | ---------- | ---------- | ----------- | ----------- |
| `warning` | 4.51       | 4.28       | 4.09        | 3.87        |
| `success` | 4.57       | 4.34       | 4.14        | **3.92**    |
| `info`    | 4.97       | 4.74       | 4.53        | **4.25**    |
| `danger`  | 5.87       | 5.56       | 5.31        | 4.98        |

`warning` was already fixed (`#926516` → `#7e5713`, worst surface 4.61) because `e2e/a11y.spec.ts` failed job detail on it. `success` and `info` were left alone because _"no current surface puts them on `muted`/`sunken` inside a scanned route."_

**That stops being true in this build.** The evidence strip (§C.2) puts `success` on `hero`; the pipeline board (§C.5) puts both on `sunken`; the never-pay banner puts `warning` on `muted` in three more places.

**DECIDED — apply the same fix that worked for `warning`: same hue, scaled to ~86% lightness.**

```ts
// packages/ui-tokens/src/index.ts — semantic
success:       "#336a33",   // was #3b7a3b. Worst surface (sunken): 4.62
successSoft:   "rgba(51, 106, 51, 0.10)",
successBorder: "rgba(51, 106, 51, 0.22)",
info:          "#295e77",   // was #2f6d8a. Worst surface (sunken): 4.71
infoSoft:      "rgba(41, 94, 119, 0.08)",
infoBorder:    "rgba(41, 94, 119, 0.20)",
```

Then `pnpm tokens:build` and commit the regenerated `tokens.css`. Visual snapshots on pages using these tints will move; that is expected and the diff should be reviewed, not suppressed.

### B.2 New tokens

Only what genuinely has no existing value. Every addition costs the system something, so each carries its justification.

```ts
// color.evidence — the standing ladder needs four distinguishable steps that
// are NOT the semantic set. A standing is not a status; painting rung 4 in
// `success` green would read as "approved", which is the exact confusion
// OCCUPATIONS.md §0 spent a page preventing.
evidence: {
  1: "#a8a596",   // مساعد   — ink-subtle family, deliberately quiet
  2: "#879953",   // brand-400
  3: "#526030",   // brand-600
  4: "#3f4a26",   // brand-700
  onLight: "#1a1a17",
},

// color.promotion — the promoted slot must be visibly distinct and must not
// borrow brand or accent, or it reads as editorial.
promotion: {
  tint:   "rgba(126, 87, 19, 0.06)",   // warning hue at 6%
  border: "rgba(126, 87, 19, 0.18)",
  label:  "#7e5713",
},

// color.connection — the three connection-class states in the chrome chip.
connectionClass: {
  slow:     "#7e5713",   // warning
  moderate: "#295e77",   // info
  fast:     "#336a33",   // success
},

// space — one addition. The facet rail and the pipeline column both need a
// 264px measure, and hardcoding it 11 times is how `text-[11px]` happened.
measure: { rail: 264, column: 288, reader: 680 },

// z — three insertions into the existing gaps-of-ten scale.
z: { ...existing, facetSheet: 35, voiceOverlay: 45, connectionChip: 15 },

// motion — the system has MOTION.md but no duration tokens; §E needs them.
motion: {
  duration: { instant: 0, fast: 120, base: 200, slow: 320 },
  easing: {
    standard:  "cubic-bezier(0.2, 0, 0, 1)",
    decelerate:"cubic-bezier(0, 0, 0, 1)",
    accelerate:"cubic-bezier(0.3, 0, 1, 1)",
  },
},
```

**Nothing else.** Every other value in this build resolves from the existing scales. If an implementation reaches for a number not on this list or the existing scales, that is a defect — add the token first, then consume it, per `CLAUDE.md`.

### B.3 The sixth surface variant

`DESIGN.md` §5.6 defines five variants and warns against flattening everything into `card`. This build needs one more, and exactly one.

| Variant    | Visual                                                                                                                           | When                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `promoted` | `promotion.tint` background, 1px `promotion.border`, radius `lg`, **no shadow**, a persistent `micro` label in `promotion.label` | The single promoted slot in a feed slate; the single promoted job above search results. Nowhere else. |

**Why a variant rather than a modifier on `card`.** A promoted item must be structurally distinguishable, not stylistically similar-but-different. Making it a variant means `Surface` is the only place the distinction lives, a component cannot accidentally half-apply it, and the ad-disclosure requirement is a type-level fact rather than a CSS convention. The absent shadow is deliberate: shadow reads as elevation, and a promotion should read as adjacent, not above.

---

## C. Screen and component specifications

### C.0 The composition rule, restated

`DESIGN.md` §6 defines a seven-element signature composition and says new screens must compose from it rather than invent a layout. **Every one of the 65 new screens in this build composes from those seven elements.** Where a screen genuinely needs something the kit lacks, this document names the new component; there are 62 of them and no more. A screen that needs a 63rd is a design defect to escalate, not to solve locally.

### C.1 Navigation — the shape after the build

The product roughly doubles in surface area. Navigation is where that either stays legible or collapses.

**Web — the primary nav stays at six items.** Not seven, not eight. `AppShell`'s six: الرئيسية · الشبكة · الوظائف · الرسائل · الإشعارات · أنا.

Everything new hangs off one of the six, or off search:

| New area                                       | Reached from                             |
| ---------------------------------------------- | ---------------------------------------- |
| Groups, Events                                 | الشبكة → tabs                            |
| Followers, Following, Alumni, Diaspora         | الشبكة → tabs                            |
| Applications, Saved searches, Documents        | الوظائف → tabs                           |
| Employer/pipeline/team/promotions              | أنا → profile menu → «مساحة التوظيف»     |
| Services, Inquiries                            | الوظائف → tab «خدمات»                    |
| Learning                                       | أنا → profile menu, and a feed rail card |
| Evidence, Verification, Recommendations, Views | أنا → profile                            |
| Billing, Plus                                  | أنا → profile menu                       |
| Drafts, Content stats, Newsletters             | الرئيسية → composer overflow, and أنا    |

**Mobile — five tabs, unchanged.** الرئيسية · الشبكة · الوظائف · الرسائل · أنا. Notifications moves into the header bell on every tab, which is where it already effectively lives. The sixth tab is not available and asking for it is the wrong question — the answer is a better أنا screen.

**The `أنا` screen becomes a hub**, not a profile preview. Top: the member's own `ProfileHeader` (hero). Then a `flat` container of `row` items grouped into four sections: مهنتي (evidence, verification, recommendations, documents), نشاطي (drafts, stats, newsletters, views), عملي (employer space, services, inquiries), and حسابي (plus, billing, settings). This is the single most important navigation decision in the redesign, because it is what absorbs 22 of the new routes without a new tab.

### C.2 Profile — the evidence-first recomposition

The master spec §5.5 fixes the section order. The design consequence:

**The evidence strip** sits directly under `ProfileHeader`, above the fold, on a `hero` surface continuous with the header rather than a separate card — visually it reads as part of the identity, because it is.

Contents, in a single row that wraps to two at 390px:

1. `StandingBadge` — the rung glyph in `evidence.{1..4}`, the family-resolved label, and the occupation. Absent entirely for `LICENSED` and `SERVICE` tracks; there is no empty state, because an absent standing is not a missing thing.
2. `LicenceBadge` — body name + `موثّقة` in `success` for `VERIFIED`; body name + `معلنة` in `ink-muted` **with no glyph and no colour** for `DECLARED`. That asymmetry is the design carrying a policy (§2.6 of the master spec) and it must not be softened for visual balance.
3. `ProofCount` — «٣ أعمال مؤكَّدة · ٢ جهات» in `small`, `ink`.
4. `VerificationChips` — up to four `micro` chips.
5. `RatingSummary` — stars + count, or count alone below `MIN_RATINGS_FOR_AVERAGE`.

**Empty state.** A profile with no evidence shows one `row`: «لا يوجد إثبات عمل بعد» plus, for the owner only, a `secondary` button «اطلب تأكيد عمل». Never a progress bar, never a percentage, never a nudge with an exclamation mark. §5.8 of the master spec: evidence copy is factual and never congratulatory.

**Featured work samples** are the third block: a horizontal `ScrollView` of 4:3 tiles at 240×180 (web) / 200×150 (mobile), blurhash-first, tap to open the post. For a craft occupation this is the CV, and it must be above About.

**Experience** is labelled «خبرة معلنة» with a `micro` helper line explaining the contrast with confirmed evidence, once, at the section head — not per row.

### C.3 Feed — ranked, finite, explainable

Three visible changes.

1. **A `Tabs` control** above the composer: مرتّب · الأحدث. Two tabs, not a dropdown, because the choice is binary and a dropdown hides it.
2. **The end state.** When the slate is exhausted, an `EmptyState` in the `harvest` kit: «وصلت إلى نهاية ما اخترناه لك اليوم» with a `secondary` «تحديث» and, below it, a quiet link to الأحدث. **No infinite spinner, ever.** This is the finiteness requirement made visible and it is a deliberate contrast with every feed the user has used.
3. **«لماذا أرى هذا؟»** in each post's overflow menu, opening a `Dialog` (web) / `Sheet` (mobile) with one sentence and the topic chips that matched. The sentence is generated from the reason kind, not free text.

**The promoted slot** is at index 4, `promoted` surface, with the `micro` «ترويج» label at the top-start of the card. It is not dismissible and it is not styled to resemble an organic post. Exactly one per slate.

**Light mode rendering.** In connection-class `slow`, `PostCard` renders: avatar at 32px, no cover images (blurhash + a tap-to-load button labelled «تحميل الصورة · ٤٨ ك.ب»), no reaction avatars, and the stat row collapsed to counts. This is a `PostCard` variant, not a separate component — `PostCard` takes `density: "light" | "normal"` in **both** kits.

### C.4 Jobs — reachability and honesty on the card

`JobCard` is rewritten. The new anatomy, top to bottom:

1. Employer identity — logo or `jobSource()`-resolved person avatar, name, `EmployerVerifiedChip` if verified.
2. Title, `h3`.
3. `CommuteChip` — «نفس المحافظة» / «محافظة مجاورة» / «الضفة» / «يتطلب تصريح» / «عن بُعد», coloured from `semantic` (`success` / `info` / `ink-muted` / `warning` / `success`).
4. Pay row — **with the basis suffix**, which is the fix for the defect in §1.4.1 of the master spec. «١٥٠ ₪ / يوم» not «١٥٠ ₪». When the range is below the statutory floor, the existing never-pay-style `warning` banner renders inline.
5. Meta row — type, posted-when, deadline if set, openings if > 1.
6. `FitMeter` — a 4-segment bar, not a percentage number. A number invites a candidate to read a 62 as a verdict; four segments read as a hint, which is what it is.

**Job detail** gains, in order: the never-pay banner (permanent, top, `warning` on `muted` — hence §B.1), the fit breakdown (`MatchBreakdown`, listing each requirement with a satisfied/unsatisfied glyph), the salary insight card if k ≥ 7 or an honest «لا تتوفر بيانات كافية» if not, company insights, and referrers in your network.

### C.5 The employer pipeline — the documented parity exception

**Web:** `PipelineBoard`, a horizontal column layout at `measure.column` (288px) per stage, drag to move. **Mobile:** `PipelineList`, a `Tabs` strip of stages over a vertical list, move via `ActionSheet`.

**This is a deliberate divergence and it must be recorded in `docs/design/PARITY.md` with this reasoning:** a kanban board at 390px is either two visible columns or unreadable text, and the mobile job here is triage — "show me the shortlist, move this one" — not spatial arrangement. Same data, same actions, same prop vocabulary on the row component; different container. `check:ui-lockstep`'s ledger gains one entry with this reason, and it is the only new entry this whole build is permitted to add.

### C.6 Messaging — three tabs and a voice bubble

Inbox: `Tabs` — الأساسي · الطلبات · المؤرشف. The requests tab carries a count badge; the others do not, because a count on الأساسي duplicates the nav badge.

`VoiceBubble`: a 44px play button, a 16-bar waveform drawn from `voiceWaveform`, duration in `micro`. **The waveform renders before any audio is fetched** — that is the entire reason the buckets are stored. Own-message bubbles use `tinted`, as they already do.

`RequestCard` shows the sender's evidence strip in miniature, because the decision "should I accept this message" is exactly an evidence question.

### C.7 Dates — the dual-calendar rule

**DECIDED:** every date rendered to a member shows the Gregorian date, and where the surface has room, the Hijri date in `micro` beneath it. This is not decoration — a large share of this market reads and states dates in Hijri, and a product that cannot is visibly foreign.

Implemented once, in `packages/shared/src/format.ts`, as `formatDualDate(date, locale)`, using `Intl.DateTimeFormat` with `ar-SA-u-ca-islamic-umalqura`. Surfaces that render it: event cards and detail, job deadlines, `WorkProof` completion dates, `Certificate` issue and expiry. Surfaces that do not: relative timestamps in the feed and messages («قبل ٣ ساعات»), which are already the right abstraction.

Arabic-Indic numerals: the existing `format.ts` already handles this and the choice is per-locale. **Do not change it**, and do not introduce a second numeral formatter.

### C.8 The connection-class chip

A persistent `micro` chip in the app chrome — web in `AppShell`'s trailing slot, mobile in the header — reading خفيف / عادي / كامل, tinted from `connectionClass`. Tappable, opening a three-option `Menu`/`ActionSheet` with a one-line explanation of each.

**Why it is always visible rather than in settings:** a user on 2G whose product has silently degraded will conclude the product is broken. Naming the mode, visibly, converts a bug report into an understood trade-off. This is the single highest-value piece of UI in the low-bandwidth workstream and it costs 40 pixels.

---

## D. The 62 new components

Every one ships in **both** kits, same commit, identical prop and variant names, unless it appears in the exceptions table at the end.

**Identity & evidence (12):** `StandingBadge` · `LicenceBadge` · `ProofCount` · `VerificationChips` · `EvidenceStrip` · `RatingSummary` · `RecommendationCard` · `CertificateRow` · `LanguageRow` · `CareerBreakSpan` · `WorkProofCard` · `VouchCard`

**Graph (4):** `FollowButton` · `DegreeChip` · `MutualsRow` · `SuggestionCard`

**Content (11):** `PollCard` · `PollOptionRow` · `ArticleCard` · `ArticleReader` · `MentionText` · `MentionTypeahead` · `NewsletterCard` · `VisibilityPicker` · `SchedulePicker` · `StatRow` · `DocumentCarousel`

**Feed (3):** `FeedEndState` · `WhyThisPost` · `TopicChipRow`

**Groups & events (8):** `GroupCard` · `GroupHeader` · `MemberRow` · `RuleList` · `EventCard` · `EventHeader` · `RsvpControl` · `DateTimeRangeRow`

**Hiring (15):** `JobCard` _(rewrite)_ · `FitMeter` · `MatchBreakdown` · `RequirementRow` · `ScreeningForm` · `ApplicantRow` · `StageChip` · `RejectionReasonPicker` · `InterviewSlotCard` · `ReferralRequestSheet` · `SalaryInsightCard` · `DocumentPicker` · `NeverPayBanner` · `EmployerVerifiedChip` · `CommuteChip`

**Services (5):** `ServiceCard` · `ServiceHeader` · `PricingRow` · `InquiryForm` · `InquiryCard`

**Learning (5):** `PathCard` · `LessonReader` · `LessonAudioPlayer` · `ProgressRail` · `CertificateAwardCard`

**Messaging (6):** `VoiceRecorder` · `VoiceBubble` · `RequestCard` · `ParticipantList` · `OutreachComposer` · `QuotaMeter`

**Commerce (6):** `PlanCard` · `PriceRow` · `WalletMethodPicker` · `CashReferenceCard` · `PromotedLabel` · `SpendMeter`

**Search (4):** `FacetChipRow` · `SavedSearchCard` · `SearchResultGroup` · `NoResultsState`

**Chrome (3):** `ConnectionClassChip` · `OfflineTray` · `CoverageMap`

### Documented one-platform exceptions

| Component       | Platform     | Reason                                                                                                                                   |
| --------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `PipelineBoard` | web only     | §C.5 — a board at 390px is unreadable; `PipelineList` is the native twin with the same row component and action vocabulary               |
| `PipelineList`  | native only  | The twin of the above                                                                                                                    |
| `FacetRail`     | web only     | Sticky rail; native uses `FacetSheet`                                                                                                    |
| `FacetSheet`    | native only  | The twin of the above                                                                                                                    |
| `VoiceRecorder` | native first | Web ships in the same phase using `MediaRecorder`; **not** an exception, just an ordering note — both must exist before the phase closes |

Every exception above must be added to `check:ui-lockstep`'s ledger **with its reason**, and the ledger must not grow beyond these four entries. It currently reads zero; ending this build at four, each justified, is the target.

---

## E. Motion

`docs/design/MOTION.md` exists; this build adds duration and easing tokens (§B.2) and three patterns:

1. **Optimistic state** — `FollowButton`, `RsvpControl`, reactions and poll votes switch instantly on tap and roll back on failure with a 120 ms cross-fade plus a `Toast`. Never a spinner on a button that can be optimistic.
2. **Slate transition** — a new feed slate fades the list at `duration.fast` and does not animate individual rows. Row-level stagger on a 2G connection is jank, and `useStagger` already exists for the cases where it is affordable.
3. **Sheet and dialog** — `duration.base` with `easing.decelerate` in, `easing.accelerate` out. Both kits.

**`useReducedMotion` already exists in `ui-native`.** Web gains the `prefers-reduced-motion` twin in the same commit, and every one of the three patterns above respects it by collapsing to `duration.instant`.

---

## F. Accessibility

`CLAUDE.md`: every interactive element needs a label, keyboard support, a visible focus ring, and a 44pt (mobile) / 40px (web) hit target. Non-negotiable and unchanged.

**Additions for this build:**

1. **Every new route enters `apps/web/e2e/a11y.spec.ts`.** All 34 of them. This is the test that caught the `warning` contrast defect, and it is the only reason it was found.
2. **Semantic tints are checked against the surface they actually sit on**, not against white. The a11y spec gains a helper that resolves the composited background before asserting the ratio — this is the systemic fix for the class of defect §B.1 repairs one instance of.
3. **`FitMeter` and `SpendMeter` never encode meaning in colour alone.** Four segments plus a text label.
4. **`StandingBadge` never encodes the rung in colour alone.** The `evidence` ramp is reinforced by the glyph and the label.
5. **`VoiceBubble` needs a transcript affordance or an honest absence.** There is no Arabic speech-to-text of acceptable quality available here, so the honest answer is: no transcript, and the bubble carries an `aria-label` stating duration and sender. Do not ship a bad transcript.
6. **RTL:** every new component uses logical properties only. `packages/config/__tests__/rtl-rules.test.mjs` runs the RTL ESLint selectors against known-bad source; every new component directory must be in its scan path.

---

## G. The RTL checklist for new work

From `docs/design/RTL.md`, restated as the specific traps this build will hit:

- **Never** `left` / `right` / `margin-left` / `padding-right`. Always `inline-start` / `inline-end` and the logical properties.
- **Icons that indicate direction must mirror**: back chevrons, "next lesson", pipeline stage arrows, the carousel controls in `DocumentCarousel`. Icons that indicate a _thing_ must not: play, pause, download, the waveform.
- **Numbers, currency and dates** stay LTR inside RTL text. `format.ts` already handles this; new surfaces must use it and must not concatenate manually.
- **The waveform in `VoiceBubble` reads start-to-end**, which in RTL is right-to-left. Audio time still flows forward. **DECIDED:** the waveform mirrors with the layout and the play head moves start→end, because the bubble is a text-flow object, not a timeline widget.
- **`PipelineBoard`'s columns** order start→end, so stage 1 is rightmost in Arabic. Horizontal scroll direction inverts accordingly.
- **The `FitMeter`'s four segments** fill from the start edge.
- **Charts** (`me/views`, `content-stats`, `SpendMeter`): the category axis runs start→end, i.e. right-to-left in Arabic. This is the single most commonly-missed RTL case in dashboards, and there are three of them in this build.

---

## H. Verification

| Check                                        | Command / method                                                  | Gate              |
| -------------------------------------------- | ----------------------------------------------------------------- | ----------------- |
| Tokens are the only source of values         | `pnpm lint:tokens`                                                | CI                |
| Generated CSS matches the source             | `pnpm check:tokens`                                               | CI                |
| Web ↔ native pairing                         | `pnpm check:ui-lockstep` — ledger ≤ 4 entries, each with a reason | CI                |
| Design QA rules (incl. the 300-LOC file cap) | `pnpm qa:design`                                                  | CI                |
| RTL selectors                                | `packages/config/__tests__/rtl-rules.test.mjs`                    | CI                |
| a11y on every route                          | `apps/web/e2e/a11y.spec.ts`                                       | CI                |
| Contrast against real surfaces               | The new composited-background helper in the a11y spec             | CI                |
| Device evidence, Arabic RTL, 390px           | `pnpm --filter @baydar/mobile e2e:device-up` then capture         | Manual, per phase |
| 2G rendering                                 | The throttled Playwright profile                                  | CI                |

**Evidence required before the redesign phase closes:** a captured screenshot of every new screen at 390px in Arabic RTL, light, on the device harness — not the emulator default, and not eyeballed. `HANDOFF.md` records that the `Tabs` underline evidence was sampled from PNG pixel values rather than judged by eye, and that is the standard this build inherits.
