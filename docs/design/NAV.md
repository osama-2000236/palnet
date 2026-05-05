# Navigation Chrome

Minimum Sprint 13 stub. `DESIGN.md` remains the source of truth.

## Current Rule

Navigation must stay Arabic-first, RTL-safe, tokenized, and consistent between web app chrome and mobile bottom tabs.

## Current Sources

- Global design direction: `DESIGN.md` sections 6, 9, and 10.
- Mobile navigation: `apps/mobile/app/(app)/_layout.tsx`.
- Web app shell: `apps/web/app/[locale]/(app)/layout.tsx`.
- App shell component spec: `docs/components/AppShell.md`.

## Tracking Notes

Do not change tab count, badge behavior, or search placement without updating this file and `DESIGN.md`.
