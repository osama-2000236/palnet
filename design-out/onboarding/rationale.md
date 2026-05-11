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

The progress strip is the only piece that has to render identically across five different screens. Inlining it would invite drift — somebody would tweak the dots on the connect screen and forget the profile screen. The primitive locks the dot/connector visuals and exposes only `step` and `totalSteps`. Same trade-off we made with `Surface` variants.

## Why dots + connector, not a fill bar

A fill bar implies linear granular progress (35%, 60%, etc). The flow has 5 discrete steps; that's the truth and the design should say so. Dots make the count visible without parsing a number, and the user can see at a glance "I'm 3 of 5." A fill bar would either approximate or lie.

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
