# Final QA Checklist

## Visual

- Compare each web page against `docs/design/prototype/PalNet Prototype.html`.
- Confirm spacing, type weight, avatar usage, surface variants, and RTL layout in `ar-PS`.
- Fix drift under two hours; file follow-ups for larger changes.

## Accessibility

- Run `pnpm --filter @palnet/web run e2e:a11y-authed`.
- Target zero serious or critical axe violations across English and Arabic.

## Production Smoke

- `/api/v1/health` returns 200.
- `/api/v1/health/ready` returns 200 with the database available and 503 when unavailable.
- Legal pages return 200 for `en`, `ar`, and `ar-PS`.
- Register consent links resolve to terms, privacy, and community guidelines.
- Mobile Settings opens all legal links.

## Release Notes Attachments

- Axe report.
- Lighthouse desktop and mobile reports.
- Search latency run at 10k posts.
