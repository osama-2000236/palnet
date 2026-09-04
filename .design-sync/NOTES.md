# design-sync notes — @baydar/ui-web

Repo-specific gotchas for future syncs. Read this before touching anything else.

## The big one: ui-web ships no CSS

`packages/ui-web` builds with plain `tsc`. Its components are styled entirely by
**Tailwind utility class strings** (`bg-brand-600`, `text-ink-inverse`, …) that
`apps/web` compiles at app-build time against `@baydar/ui-tokens`'s preset. The
package itself emits zero CSS, so a naive sync produces 32 fully-functional but
completely unstyled components.

`.design-sync/ds-styles/` solves this: a design-sync-only Tailwind config +
input that compiles the sheet into `packages/ui-web/dist/ds-styles.css`, which
`cfg.cssEntry` then picks up. **`cfg.buildCmd` runs both steps** — or just run
`sh .design-sync/rebuild.sh` from the repo root, which does CSS + converter in
one go and is what every step below assumes.

### The safelist is load-bearing — don't drop it

Tailwind only emits classes it finds in `content`. That's correct for an app and
wrong here: the compiled sheet is the **entire** styling surface handed to
designs the Claude Design agent builds, and that agent writes utilities ui-web's
internals never used. Before the safelist, 11 of the 44 families documented in
`conventions.md` (`text-h2`, `shadow-modal`, `ease-spring`, `text-end`, …) simply
did not exist in the shipped CSS — they would have resolved to nothing, silently.
The safelist is generated **off the preset**, so it cannot drift from the tokens.

Consequence worth knowing: **arbitrary-value utilities never work in generated
designs** (`max-w-[560px]`, `text-[15px]`). There is no JIT pass at design time.
`conventions.md` says so explicitly; keep that paragraph.

## Entry path

Pass `--entry ./packages/ui-web/dist/index.js` — a **repo-root-relative** path.
`package.json` `main` points at `./src/index.ts`, so the converter can't find the
dist entry on its own. A package-relative `./dist/index.js` resolves against the
CWD, walks up to the repo-root `package.json`, and sets `PKG_DIR` to the repo
root — which then reports `[NO_DIST]` and `[DTS_REACT]` and finds no components.

Use `packages/ui-web/node_modules` for `--node-modules`: it has `react`,
`react-dom` and `@types/react`, and the workspace symlink to `@baydar/ui-tokens`.

## Preview authoring

- Exports must be **component functions** — `export const Foo = () => (<jsx/>)`.
  A bare element (`export const Foo = (<jsx/>)`) makes the harness report
  "preview module evaluated to no exports"; it filters on `typeof === 'function'`.
- Import from `"@baydar/ui-web"`; the harness shims it to `window.BaydarUI`.
- **Verify props against the source before writing.** esbuild strips types
  without checking them, so a wrong prop name renders silently wrong, not as an
  error. Already bitten: `Input` has **no `label` prop** (the host owns the
  `<label>`); `ComposerMedia.mimeType` is required; `RadioGroup` uses
  `onValueChange`, not `onChange`.
- **RTL comes from CSS, not per-preview.** `ds-styles/input.css` sets
  `html { direction: rtl }`, which is why every card reads correctly without a
  wrapper. Don't add `dir` attributes to previews.
- Arabic copy: lift real strings from `apps/web/messages/ar-PS.json` rather than
  inventing them.
- `position: fixed` layers (Dialog, ReportDialog, Toast\*) are contained by the
  card, which has no height when its only children are fixed — the overlay then
  centers against a zero-height box and gets clipped. Dialog/ReportDialog wrap
  their cells in a `Stage` div with an explicit `minHeight`; the Toast cards keep
  their copy low and narrow instead. `cfg.overrides` pins `cardMode: "single"`
  plus a short `viewport` for all of them.
- A **new utility class in a preview needs the CSS rebuild** (`rebuild.sh`), not
  just `preview-rebuild.mjs`. A bare preview-rebuild leaves the class undefined
  and the change appears to do nothing. Inline styles avoid the trap for
  preview-only scaffolding.
- Don't regex-transform preview JSX in bulk — it mangled the `Stage` helper in
  Dialog/ReportDialog and had to be repaired by hand. Edit the files directly.
- **Format before committing** — CI's `format:check` runs prettier over the whole
  repo, so unformatted preview sources fail the lint job:

  ```sh
  pnpm exec prettier --write ".design-sync/**/*.{ts,tsx,js,json,md}"
  ```

  Doing this last also rewrites preview source hashes. If a later sync clears all
  32 grades for no visible reason, that is why — re-verifying is the correct
  response, not chasing it.

## Grouping

All 32 components land in the single `general` group. Only 6 have real docs
(`docs/components/*.md`). Grouping the other 27 would mean pointing `cfg.docsMap`
at frontmatter-only stub `.md` files — and a component with a `docBody` gets **no
synthesized `## Examples` section**, so the authored preview JSX would vanish
from its `.prompt.md`. Flat grouping was judged the better trade. Revisit only if
real per-component docs get written.

## Fonts — substitutes accepted (owner decision, 2026-07-21)

Shipped: IBM Plex Sans Arabic (400/500/600/700) and Noto Naskh Arabic (400/700),
vendored into `.design-sync/fonts/` from the `@expo-google-fonts/*` packages
already in the lockfile (OFL-1.1) and wired via `cfg.extraFonts`. The web app
loads these through `next/font/google`, so the package ships no `@font-face` of
its own — without this, every card and every generated design falls back to a
Latin system font, which is wrong for an Arabic-first product.

`[FONT_MISSING]` still names **"IBM Plex Sans"** and **"IBM Plex Mono"**. Neither
exists in the repo or lockfile. The owner accepted substitutes: IBM Plex Sans
Arabic already covers Latin glyphs so the Latin fallback is effectively never
reached, and `--font-mono` only affects code blocks. **This warn is expected —
do not chase it.**

## Known render warns

- `[FONT_MISSING]` for "IBM Plex Sans" / "IBM Plex Mono" — accepted, see above.
- `[DTS_STYLE_SYSTEM] filtering @types/react props` — informational; the DOM
  prop bag is correctly filtered out of the emitted `<Name>Props`.
- `[DOCS_UNMAPPED]` × 27 — expected, see Grouping.

## Upstream bugs found while building previews

Each has a background task filed. None is a preview problem; the cards render
them honestly.

1. ~~`Illustration`: `error`/`saved` motifs drew nothing.~~ **Fixed upstream in #72** —
   all ten motifs now draw in every direction, and the EmptyState/Illustration
   previews were restored to use the real motifs.
2. ~~`Icon`: no `case "building"`.~~ **Fixed upstream in #73** — the glyph now
   renders on both the web and native shells.
3. ~~Numeric runs with a separator reversed under RTL~~ — **fixed in this
   branch.** Composer's counter, both OnboardingProgress render paths and
   RoomRow's timestamp now carry `dir="ltr"`, and the native OnboardingProgress
   twin uses `writingDirection: "ltr"`. If you add another `{a} / {b}` or time
   range, it needs the same treatment.
4. ~~`ReportDialog` painted the UA focus outline around its whole form~~ —
   **fixed in this branch.** Both that form and `Dialog`'s own panel (the
   fallback focus target) now set `focus:outline-none`.

All four are now fixed, so `conventions.md` has **no** "Known gaps" section — it
was deleted rather than left listing bugs that no longer reproduce. If you add
one back, **delete the line as soon as its fix lands**: a stale gap note sends
the design agent around art that already exists, and it trusts that file.

## Re-sync risks

- **`conventions.md` is hand-maintained and content-bearing.** Its family table
  and the safelist in `ds-styles/tailwind.config.cjs` must agree. The safelist
  derives from the preset automatically; the table does not. If a token family is
  added or renamed in `@baydar/ui-tokens`, re-verify every name in the table
  against `ds-bundle/_ds_bundle.css` before shipping — a documented class that
  doesn't resolve is worse than no documentation, because the agent trusts it.
- **The "Known gaps" section rots.** It names four upstream bugs. Check whether
  they still reproduce before re-shipping the header.
- **Previews inline data** (Arabic copy, label objects, data-URI images). None of
  it is `$ref`-backed, so if `apps/web/messages/ar-PS.json` changes wording, the
  cards keep the old strings. Cosmetic, not correctness.
- **Previews import from the package barrel**, which nothing else does —
  `apps/` and the kit tests both reach past it (`require("../../dist/Foo")`).
  Deleting an `index.ts` re-export therefore breaks a card with every gate
  still green. `check:ui-lockstep` now fails on that; don't route around it.
- **Fonts are vendored copies**, not links. If `@expo-google-fonts/*` bumps its
  font version, `.design-sync/fonts/*.ttf` will not follow.
- **Playwright pin**: the render check needs a `playwright` whose `browsers.json`
  matches a cached chromium build. `playwright@1.59.1` pins chromium 1217, which
  was present in `~/AppData/Local/ms-playwright/`. On a fresh machine, check the
  cache first — a mismatch fails with "Executable doesn't exist".
- **Only partially verified**: hover/press/focus states and all motion, which a
  static screenshot cannot capture. The DS's animation tokens
  (`duration-*`, `ease-*`, `animate-enter-up`) are safelisted but never visually
  confirmed.
- **Not verified at all**: dark mode. `tokens.css` defines a full dark palette
  (a second `:root` block around line 229) but every preview and the compiled
  sheet render light only. If dark-mode designs matter, that is the next gap to
  close.

## design-system v2 (2026-07-26) — what changed for the sync

Three new utility classes ship in `apps/web/src/app/globals.css` and are
**mirrored into `ds-styles/input.css`**, because the compiled sheet is the
entire styling surface handed to generated designs. Without the mirror they
resolve to nothing and no error is raised — the same silent failure the
safelist exists to prevent, and the reason that paragraph is load-bearing.

| Class          | Does                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| `.target-area` | Expands a control's pressable box to `--target-min` without changing layout |
| `.state-layer` | The tokenized hover/pressed/selected ink overlay (A4.5)                     |
| `.react-press` | Press physics for the reaction moment (A4.6), plus `.react-glyph`           |

Also `.dialog-scrim`, `.dialog-panel`, `.toast-item` for entrances (A4.7).

**These are hand-written classes, not preset-derived, so the safelist cannot
generate them.** They live in both stylesheets and must stay in step. If a
preview renders a control that looks inert on hover, check that first.

New token families the preset now emits, all safelist-derived and therefore
drift-proof: `z-*` (layering), `min-h-target` / `min-w-target`,
`duration-slower`.

`Dialog` now renders through a **portal on `document.body`**. Previews that
wrap it in a `Stage` div with an explicit `minHeight` still work — the overlay
is `position: fixed` either way — but it no longer server-renders at all, so a
preview harness that only does SSR will show nothing for it.

`Tabs` gained an injected `formatCount`. (It also briefly gained a `TabPanel`;
audit 9 deleted it — no surface ever mounted one — and the `WithPanel` story
went with it.) The preview passes a
real `Intl.NumberFormat("ar-PS-u-nu-arab")` formatter on purpose: without it
the badge renders Latin digits inside an Arabic UI, which is the exact defect
A2.14 fixed, and a preview showing it uncorrected would teach the wrong thing.

## design-system v3 (2026-07-27) — what changed for the sync

**The type scale changed under every card.** The preset now re-points Tailwind's
own t-shirt keys at Baydar's steps (`text-sm` is 13px, not 14; `text-3xl` is
26px, not 30) and adds an eighth step, `micro` (11px). Both come off the preset,
so the safelist picks them up with no edit here — but every generated design
built before this will render one step different, and that is correct rather
than a regression. `text-micro` is the floor; `lint:tokens` now fails on
`text-[Npx]` and on `text-6xl`+.

One more hand-written rule is mirrored into `ds-styles/input.css`, and like the
other three it cannot be generated from the preset:

| Class                                         | Does                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `.state-layer.react-press[aria-pressed=true]` | Drops the selected slab to hover strength inside the post action bar (see globals.css) |

New components the previews do not cover yet: `Badge`, `Textarea`, `Menu`,
`SwitchRow`, `ReactionGlyph`, `ReactionPicker`. `PostCard`'s props changed —
`liked: boolean` + `onToggleReaction` became `reaction: ReactionKind | null` +
`onSetReaction`, and `labels.like` / `labels.liked` became `labels.reactions`
(a `{ pick, kind }` bundle). A preview written against the old shape renders
without a reaction button and throws on `labels.kind[shown]`.
