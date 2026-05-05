# Sprint 13 Decisions

## API Response Envelopes

Decision: keep the current shipped raw DTO exceptions and document them in `docs/api-contract.md`.

Rationale: wrapping every raw route would be a broader API migration than Sprint 13 needs. The contract now defaults new routes to `{ data, meta? }` while explicitly listing existing raw routes for messaging detail/actions, job detail/apply, notification counts/actions, no-content routes, health, and SSE.

Regression coverage pins `GET /messaging/rooms/:id`, `GET /jobs/:id`, and `GET /notifications/unread-count`.

## Design Dead Links

Decision: restore minimum viable stubs for `docs/design/PARITY.md`, `docs/design/NAV.md`, and `docs/design/SCREENS.md`.

Rationale: `DESIGN.md` intentionally delegates those topics to companion specs. Stubs preserve the roadmap intent without inventing new design decisions in this foundation sprint.
