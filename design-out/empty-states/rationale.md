# Rationale — empty-state pass

Why a new component and not just better copy: `DESIGN.md §12` already required an illustration slot, copy, and a recoverable action. None of the eight shipping screens had all three. Adding them ad-hoc to each screen would replicate the same surface, the same icon-circle, and the same `Surface variant="tinted"` ten times over. One primitive replaces ten near-duplicates and locks the shape down so no future screen drifts.

Why illustrations, not richer icons: the existing Icon wrapper is a 24px lucide glyph. At 24px there is nothing to look at when a screen has zero content — the eye lands on a small mark and a sentence. A 128px two-tone illustration gives the screen visible structure on first paint, which is exactly when the user is deciding whether the product is alive. Eight illustrations is the minimum that lets every screen feel distinct without inventing a sprawling registry.

Why agrarian-geometric, not photographic or 3D-isometric: Baydar's metaphor is the threshing floor. LinkedIn-style 3D people and SaaS-default mesh blobs are explicitly out per `BRAND.md` and the moodboard in `design-handoff-2026-05/09-moodboard`. Geometric two-tone is on-brand (olive + warm tint, no decoration beyond what is already token-blessed), cheap to maintain (≤30 lines of SVG each), and survives translation between desktop, mobile, and the existing token system without re-tinting.

Why one component, not separate `EmptyFeed` / `EmptyMessages` / etc: the shape is identical — illustration + title + description + optional action. Splitting per screen would duplicate the Surface and Button wiring, drift between platforms, and triple the i18n surface. The illustration is passed in as a `ReactNode`, so screens choose their motif without an enum. Same trade-off the existing `Surface` makes.

Why `EmptyState` is distinct from native `StateMessage`: `StateMessage` is doing two jobs today — empty *and* error/offline banners. Splitting the two means error states keep their alert role and danger/warning tones, and empties get the comfortable padding + illustration slot they actually need. Both stay alive in the kit.

Tradeoff considered and rejected: extending `StateMessage` with an `illustration` prop instead of shipping a new component. Rejected because the layout differs (centered comfortable padding vs. row layout for banners), the semantic role differs (status vs. alert), and the prop surface diverges (action with `href` makes sense for an empty state, not for an error banner).

Out of scope for this pass: motion on illustration enter, dark-mode variants, decorative illustration for non-empty surfaces (post-detail covers, etc). All deferred per `10-ask.md` out-of-scope list.
