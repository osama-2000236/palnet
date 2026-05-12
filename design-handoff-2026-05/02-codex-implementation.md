Implemented the unblocked scoped items and wrote/printed the packet at `design-handoff-2026-05/02-codex-implementation.md`.

Changed:
- `apps/web/src/app/[locale]/(app)/jobs/page.tsx`: job card title is now a styled `<p>`, removing the H1-to-H3 skip.
- `DESIGN.md`: added `Toast` to §7 with Web ✅ and Native ✅.

QA:
- Passed `corepack pnpm lint:tokens`
- Passed `corepack pnpm --filter @baydar/web type-check`
- Passed `corepack pnpm --filter @baydar/api type-check`
- Blocked on Playwright/dev snapshot checks due sandbox `spawn EPERM`, including `browserType.launch: spawn EPERM` and Next dev worker `Error: spawn EPERM`.

No commit was made.