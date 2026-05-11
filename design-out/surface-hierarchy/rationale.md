# Rationale — surface hierarchy pass

The shipped screens were not "wrong" — every screen was readable, accessible, and shipped on token. The audit asked a different question: when the eye lands on a page, can it tell what *kind* of thing each block is? On Network and Jobs the answer was no — every row had the same `flat` (or `card`) outline, so a list of ten records looked like ten unrelated bounded boxes. That's the "every section as a card" anti-pattern called out in `DESIGN.md §13` and `08-problems.md #5`.

The fix is the one already in the design system: list = one `flat` container, items = `row` Surface variants inside it. Internal hairlines, single outer border. The variant exists precisely for this case; it was not being used on the two screens where it matters most.

Why network and jobs and not the others: feed posts and messages threads are *content units*, not list rows — a post is a thing you read, not a record you scan. Both deserve their `card`. Notifications already differentiates rows by unread tint, so a `row` Surface would erase the read-state cue. Profile sections are content blocks (about, experience, education), so they sit as `flat` siblings rather than rows in a list. Settings already uses the recipe.

Why left filters in jobs kept their `card`: the filter aside is a *control surface*, not a list. It earns its border + shadow because it's the thing changing the result column. Dropping it to `flat` would make it disappear into the page background.

Why right rails stayed where they are: rails belong on screens where the user is *browsing* (feed). The other screens are doing one verb each (read, search, connect, configure) and a rail would compete. The rail policy doc enumerates this explicitly so the next contributor doesn't add a rail "because the column is empty."

Why `SCREENS.md` went from stub to a long doc: composition rules drift the fastest. Token rules are enforced by lint, but no linter catches "every section as a card." A written per-screen recipe lets a reviewer say "the recipe says network is one flat with row items; this PR adds back the per-row card" without arguing taste. That's the trade `DESIGN.md` already made for color and spacing.

Tradeoff considered: a `List` primitive that wraps `flat + row` automatically. Rejected because every list currently has its own item shape (connection rows have actions in the trailing area, job rows have a logo + multi-line meta, blocked list has its own component). A single `List` would either bloat with prop forks or sit unused. The variant pair (`flat` + `row`) is the primitive.

Tradeoff considered: tightening rows to `padding="3"` instead of `padding="4"`. Rejected for now — the existing 16px row padding matches the prototype and the existing `RoomRow` and `BlockedListItem` patterns. Tightening one screen creates drift; tighten all if at all, in a separate pass.

Out of scope per `10-ask.md`: motion vocabulary for list rows (`enter`/`stagger`), dark mode of `row` surfaces, hover state for keyboard-only focus. All deferred.
