# Testing Strategy

Testing keeps AI-assisted changes from drifting silently. Use the lightest test that proves the risk.

## Standard Gates

```powershell
pnpm lint:tokens
pnpm format:check
pnpm lint
pnpm type-check
pnpm test
pnpm --filter @baydar/db generate
```

## Layers

| Layer                | Tooling                                               | Location                                            |
| -------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| API unit/integration | Jest, Nest testing utilities, Supertest where present | `apps/api/src/**/*.spec.ts`                         |
| Shared contracts     | Jest + Zod schemas                                    | `packages/shared/src/**/*.spec.ts`                  |
| Native primitives    | Jest + React Native Testing Library                   | `packages/ui-native/src/__tests__` and mobile tests |
| Web routes           | Playwright                                            | `apps/web/e2e`                                      |
| Token policy         | `scripts/lint-tokens.mjs`                             | repo root                                           |

## Rules

- Every API service change should cover happy path and meaningful failure paths.
- User-facing changes need web Playwright, native Jest, or explicit manual smoke evidence depending on platform risk.
- Authenticated web accessibility coverage should use a seeded session fixture when available.
- Mobile-only behaviors that need hardware or OS services require real-device notes before release.
- Do not test Prisma internals or Zod internals; test Baydar composition and behavior.
- Keep snapshots limited to UI output where they catch meaningful regressions.

## Known Gaps

- Native branch coverage remains thin for several shared primitives.
- Some mobile flows still need physical-device confirmation because simulators cannot prove push delivery, haptic feel, or app handoff behavior.
