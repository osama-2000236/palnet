# Rationale — onboarding pass

The onboarding ask in `10-ask.md` asks for "flow design + shell decision + per-step mocks + add onboarding to SCREENS.md." The shell decision was already documented in `DESIGN.md §11.1` from a prior pass — confirmed here, not re-litigated. The other three items are net-new.

## Scope discipline

R3 in this PR delivers:

- `OnboardingProgress` primitive (web + native) — the one shared piece across every step.
- Flow design end-to-end with state-machine boundaries (`flow.md`).
- Shell decision restated, with the _why-not_ alternatives (`shell-decision.md`).
- Per-step content direction in `flow.md` (not separate mock PNGs — the code-first agreement says code-and-screenshots are the mock format).
- Onboarding section in `docs/design/SCREENS.md`.

R3 explicitly **does not** land:

- The web multi-step migration (current `/onboarding` is single-step). That's two new routes, a state machine, and a refactor of an existing form. Adding it to this PR balloons the diff. Track as a follow-up.
- The mobile `OnboardingProgress` drop-in (mechanical replacement of an inline strip). Same follow-up.

Both items are explicitly listed in `flow.md` "Acceptance" with `[ ]` checkboxes.

## Why a primitive, not inline JSX in each route

The progress strip is the only piece that has to render identically across five different screens. Inlining it would invite drift — somebody would tweak the visual on the connect screen and forget the profile screen. The primitive locks the visual styles (`bar | dots | segmented`) and exposes only `current` and `total`. Same trade-off we made with `Surface` variants.

## Why three visual styles, not one

The primitive ships `bar | dots | segmented`. Default is `bar` because for a 5-step flow the user mostly wants to know "how close am I" — a filled track + the tabular fraction `٣ / ٥` answers that without parsing. `dots` is for step-preview surfaces where each step has a label worth showing. `segmented` is for screens where each step is roughly equal-weight and a divided bar reads cleaner than a continuous fill. All three share the same `role="progressbar"` contract, so screen readers don't see drift.

## Why bare shell is the answer

See `shell-decision.md`. The short version: the API guard 403s every other tab until onboarding finishes, so showing the chrome teases content the user can't reach. The bare shell makes the next step the only thing on screen.

## Tradeoff considered and rejected

`OnboardingShell` as a primitive. The rendered structure is `<main>` + centered column + max-width — that's already idiomatic Next/Expo route shape. Wrapping it would add a layer without isolating anything reusable. The only genuinely reusable piece is `OnboardingProgress`.

Another considered: a route group `/onboarding/(steps)` with shared layout. Rejected because the current setup already has `isBareAppRoute()` doing the layout switch, and adding a route group on top would force renames elsewhere. The follow-up PR can revisit if it makes the multi-step refactor cleaner.

## Out of scope per `10-ask.md`

- Logo work (BRAND.md addresses separately).
- Motion choreography between steps.
- Dark-mode treatment of the progress strip.
- A "skip onboarding" escape hatch — explicitly disallowed by the API guard.
