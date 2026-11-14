# Domain Docs

How the engineering skills consume this repo's domain documentation.

## Before exploring, read these

- `GLOSSARY.md` at the repo root, or `GLOSSARY-MAP.md` if it exists.
- `docs/adr/` for decisions touching the area being explored.
- In multi-context areas, also check `src/<context>/docs/adr/`.

If these files do not exist, proceed silently. `/domain-modeling` creates them lazily when terms or decisions are resolved; do not create placeholders upfront.

## Layout

This repo uses **single-context** domain docs: one root `GLOSSARY.md` and `docs/adr/`.

Use glossary vocabulary in issue titles, refactor proposals, hypotheses, and test names. Flag any ADR conflict explicitly rather than silently overriding a recorded decision.
