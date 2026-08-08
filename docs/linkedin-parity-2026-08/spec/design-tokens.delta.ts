// spec/design-tokens.delta.ts
//
// The COMPLETE token delta for the LinkedIn-parity build. Merge into
// packages/ui-tokens/src/index.ts, then run `pnpm tokens:build` and commit the
// regenerated packages/ui-tokens/src/tokens.css. `pnpm check:tokens` fails CI
// on drift, so a hand-edited tokens.css will not survive.
//
// tokens.native.ts is hand-authored (RN shadows, the tighter mobile type scale
// and PostScript font names are not derivable) — it must reference the new
// values from `tokens`, never restate them.
//
// RULE: nothing else. Every other value in the build resolves from the existing
// scales. If an implementation reaches for a number not on this list or the
// existing scales, that is a defect: add the token first, then consume it.
// CLAUDE.md, "Tokens are the source of truth."

// ═══════════════════════════════════════════════════════════════════════════
// 1. CHANGED — semantic contrast repair
// ═══════════════════════════════════════════════════════════════════════════
//
// Audit A6 tuned every light semantic to ~4.5:1 against its own translucent
// tint OVER WHITE ONLY. Measured against the warm surfaces that actually exist:
//
//   token    white  muted  subtle  sunken
//   warning  4.51   4.28   4.09    3.87   <- already fixed to #7e5713 (4.61)
//   success  4.57   4.34   4.14    3.92   <- FIXED HERE
//   info     4.97   4.74   4.53    4.25   <- FIXED HERE
//   danger   5.87   5.56   5.31    4.98   <- holds everywhere, unchanged
//
// success/info were left alone because "no current surface puts them on
// muted/sunken inside a scanned route" (HANDOFF.md). That stops being true in
// this build: the evidence strip puts success on `hero`, the pipeline board
// puts both on `sunken`, and the never-pay banner puts warning on `muted` in
// three more places.
//
// The fix is the one that worked for warning: same hue, scaled to ~86%
// lightness. Visual snapshots on pages using these tints WILL move. Review the
// diff; do not suppress it.

export const SEMANTIC_PATCH = {
  success: "#336a33", // was #3b7a3b. Worst surface (sunken): 4.62
  successSoft: "rgba(51, 106, 51, 0.10)",
  successBorder: "rgba(51, 106, 51, 0.22)",
  info: "#295e77", // was #2f6d8a. Worst surface (sunken): 4.71
  infoSoft: "rgba(41, 94, 119, 0.08)",
  infoBorder: "rgba(41, 94, 119, 0.20)",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 2. NEW — color.evidence
// ═══════════════════════════════════════════════════════════════════════════
//
// The Standing ladder needs four distinguishable steps that are NOT the
// semantic set. A standing is not a status; painting rung 4 in `success` green
// would read as "approved", which is the exact confusion OCCUPATIONS.md §0
// spent a page preventing. Derived from the existing brand ramp so the ladder
// reads as one family and nothing new enters the palette.
//
// a11y: the rung is NEVER encoded in colour alone. StandingBadge carries the
// glyph and the family-resolved label too.

export const EVIDENCE = {
  1: "#a8a596", // مساعد — ink-subtle family, deliberately quiet
  2: "#879953", // brand-400
  3: "#526030", // brand-600
  4: "#3f4a26", // brand-700
  onLight: "#1a1a17",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 3. NEW — color.promotion
// ═══════════════════════════════════════════════════════════════════════════
//
// The promoted slot must be visibly distinct and must NOT borrow brand or
// accent, or it reads as editorial. Warning hue at very low alpha: adjacent to
// the system, unmistakably not part of it.

export const PROMOTION = {
  tint: "rgba(126, 87, 19, 0.06)",
  border: "rgba(126, 87, 19, 0.18)",
  label: "#7e5713", // = semantic.warning, post-fix
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 4. NEW — color.connectionClass
// ═══════════════════════════════════════════════════════════════════════════
//
// The three states of the persistent connection-class chip (§C.8 of the design
// spec). Aliases of the post-fix semantics, named so the chip does not have to
// know that "slow" happens to be "warning".

export const CONNECTION_CLASS = {
  slow: "#7e5713", // semantic.warning
  moderate: "#295e77", // semantic.info (post-fix)
  fast: "#336a33", // semantic.success (post-fix)
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 5. NEW — space.measure
// ═══════════════════════════════════════════════════════════════════════════
//
// Three named measures. The facet rail and the pipeline column each need a
// fixed width in eleven places; hardcoding them is exactly how `text-[11px]`
// appeared 28 times before `micro` was named.

export const MEASURE = {
  rail: 264, // FacetRail, feed left rail
  column: 288, // PipelineBoard stage column
  reader: 680, // ArticleReader, LessonReader — the comfortable Arabic measure
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 6. NEW — z insertions
// ═══════════════════════════════════════════════════════════════════════════
//
// The existing scale uses gaps of ten specifically to leave room to insert.
// These three fill gaps; they do not renumber anything.

export const Z_ADDITIONS = {
  connectionChip: 15, // above sticky (10), below facetSheet
  facetSheet: 35,
  voiceOverlay: 45, // recording overlay, above facetSheet, below dialog
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 7. NEW — motion
// ═══════════════════════════════════════════════════════════════════════════
//
// docs/design/MOTION.md exists and describes the patterns; there were no
// duration or easing tokens behind it, so every animation picked its own
// number. Three patterns in §E of the design spec consume these.
//
// `instant` is not decorative: prefers-reduced-motion / useReducedMotion
// collapses every duration to it.

export const MOTION = {
  duration: { instant: 0, fast: 120, base: 200, slow: 320 },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    decelerate: "cubic-bezier(0, 0, 0, 1)",
    accelerate: "cubic-bezier(0.3, 0, 1, 1)",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// 8. NEW — the sixth Surface variant
// ═══════════════════════════════════════════════════════════════════════════
//
// DESIGN.md §5.6 defines five variants and warns against flattening everything
// into `card`. This build adds exactly one more, and it must be added to
// docs/components/Surface.md in the same commit.
//
//   Variant     Visual                                              When
//   promoted    promotion.tint bg, 1px promotion.border, radius lg, NO shadow,
//               persistent `micro` label in promotion.label
//               -> the ONE promoted slot in a feed slate; the ONE promoted job
//                  above search results. Nowhere else.
//
// Why a variant rather than a modifier on `card`: a promoted item must be
// STRUCTURALLY distinguishable, not stylistically similar-but-different.
// As a variant, `Surface` is the only place the distinction lives, a component
// cannot half-apply it, and ad disclosure becomes a type-level fact rather
// than a CSS convention. The absent shadow is deliberate — shadow reads as
// elevation, and a promotion should read as adjacent, not above.

export type SurfaceVariantV2 = "flat" | "card" | "hero" | "tinted" | "row" | "promoted";

// ═══════════════════════════════════════════════════════════════════════════
// 9. Merge shape
// ═══════════════════════════════════════════════════════════════════════════
//
// export const tokens = {
//   color: {
//     brand:    { ...unchanged },
//     accent:   { ...unchanged },
//     ink:      { ...unchanged },
//     surface:  { ...unchanged },
//     line:     { ...unchanged },
//     semantic: { ...existing, ...SEMANTIC_PATCH },
//     cover:    { ...unchanged },
//     evidence:        EVIDENCE,          // NEW
//     promotion:       PROMOTION,         // NEW
//     connectionClass: CONNECTION_CLASS,  // NEW
//   },
//   radius: { ...unchanged },
//   shadow: { ...unchanged },
//   type:   { ...unchanged },   // the 8-step scale is complete; micro is the floor
//   space:  { ...unchanged, measure: MEASURE },   // NEW sub-object
//   z:      { ...existing, ...Z_ADDITIONS },
//   motion: MOTION,             // NEW top-level
// } as const;
//
// NOT CHANGED, and each for a reason:
//   * brand / accent — CLAUDE.md: the brand is olive, no Tailwind blue.
//   * type.scale — eight steps, `micro` is the floor and nothing goes below it.
//   * space 0..24 — the 4px scale covers every layout in this build.
//   * radius, shadow — unchanged.
//   * No dark mode. project-spec.md forbids it without explicit approval.
