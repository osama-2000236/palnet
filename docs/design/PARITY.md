# Cross-Platform Parity

Minimum Sprint 13 stub. `DESIGN.md` remains the source of truth.

## Current Rule

Web and native components should share prop names, variant names, and token usage when both platforms ship the component.

## Current Sources

- Component inventory: `DESIGN.md` section 7.
- Native implementation: `packages/ui-native/src/`.
- Web implementation: `packages/ui-web/src/`.
- Prototype reference: `docs/_archive/prototype-2025/Baydar Prototype.html`.

## Tracking Notes

App-local mobile versions are acceptable while a shared native component is not yet stable. Promote to shared UI after repeated screen reuse.
