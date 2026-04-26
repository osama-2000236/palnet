# AI Prompt Cheatsheet

Copy-paste these into Codex, Gemini, or Claude. Every prompt starts with the prefix from [`project-spec.md §6`](../project-spec.md). The blocks below are the *rest* of the prompt.

---

## New NestJS module

```
Add a Nest module at apps/api/src/modules/<name>/ with:
- <name>.module.ts
- <name>.controller.ts
- <name>.service.ts
- <name>.guard.ts if protected
- <name>.spec.ts (Jest) with happy path + two failure cases

Rules:
- Import DTO types from @baydar/shared.
- Use ZodValidationPipe from packages/api/src/common/zod-pipe.ts.
- Use @ApiTags / @ApiOperation / @ApiResponse on every route.
- DB access via @baydar/db singleton only.
- Return { data, meta? } or throw a DomainException with an ErrorCode.
```

## New Zod schema (shared)

```
Add <Schema> to packages/shared/src/schemas/<file>.ts.
- Export both the schema and its inferred type.
- Re-export from packages/shared/src/index.ts if not already.
- Do not duplicate an existing schema; extend instead.
- Keep constraints strict (min/max, enum use, regex) — no open strings.
```

## New Prisma entity

```
Add model <Name> to packages/db/prisma/schema.prisma.
- Include id (cuid), createdAt, updatedAt.
- Add indexes on every FK and any compound (ownerId, createdAt) list key.
- Specify onDelete explicitly (Cascade / SetNull / NoAction).
- Update docs/erd.md with the new table and cascade rules.
- Generate a migration: `pnpm --filter @baydar/db db:migrate --name <slug>`.
```

## New Next.js route

```
Add route at apps/web/src/app/<segment>/page.tsx.
- Use next-intl t() for every string.
- Server component by default; mark "use client" only where needed.
- Load data via @baydar/shared + typed fetch helper in apps/web/src/lib/api.ts.
- Render <Skeleton/> during suspense, <ErrorState/> on error.
- Respect RTL — no left/right CSS; use start/end.
```

## New Expo screen

```
Add screen at apps/mobile/src/screens/<Name>Screen.tsx.
- Use i18next t() for every string.
- Wire navigation type in apps/mobile/src/navigation/types.ts.
- Use NativeWind with ps-/pe-/ms-/me- for RTL safety.
- Data via shared API client in apps/mobile/src/lib/api.ts.
```

## New Playwright E2E

```
Add test at apps/web/e2e/<flow>.spec.ts.
- Use test.use({ locale: 'ar-PS' }) for the primary run.
- Seed state via API, not UI, where possible.
- One visual snapshot per major page-state.
- Assert both happy and one failure path.
```

## New Detox E2E

```
Add test at apps/mobile/e2e/<flow>.e2e.ts.
- Log in via API seed, then launch the app with token in AsyncStorage.
- One happy path minimum.
- Gate with a feature flag from packages/shared if behind a rollout.
```

## Refactor ask (keep tight)

```
Refactor <file> to <goal> without changing behavior.
- Do not add new deps.
- Do not add new features.
- Keep function signatures public to the module boundary.
- Existing tests must pass unchanged; add new tests for newly extracted units.
```

## Review ask

```
Review the diff at <branch/PR>. Flag:
- Project-spec.md violations.
- Hardcoded strings.
- left/right CSS.
- Any `any` not annotated with a reason.
- Missing Swagger decorators.
- Missing tests for new service methods.
Output a checklist, not a rewrite.
```

---

## Prompt hygiene

- Do not ask for "the whole page" — ask for one file or one module.
- Always paste the schema of the data involved (Zod or Prisma), not a description.
- If the output breaks a rule, reject and ask again — do not hand-edit, because the divergence will propagate.
