# Design Problems — Confirmed Targets

System-level weak spots identified in repo analysis. Independent of `08-pain.md` (subjective UX walk-through).

1. **`docs/design/SCREENS.md` is a stub.** No per-screen recipe matrix. Risks composition drift across feed/profile/network/jobs/messages/notifications/search/auth.
2. **Dark mode undecided.** `tokens.css` comment says "No dark mode yet — do not add." Decide: ship light-only or scope dark.
3. **Empty-state illustrations missing across all 8 screens.** `DESIGN.md §12` mandates illustration slot in empty states; none implemented. Style direction undefined.
4. **Profile cover gradient palette unspecified.** `DESIGN.md §13` allows it as the single decorative gradient — but no token, no palette, no recipe.
5. **Five surface variants under-utilized.** Likely "every section as `card`" anti-pattern in shipped screens. Surface scan needed per screen.
6. **Mobile `Tabs` primitive: not started.** `DESIGN.md §7.3` flags ⏳. Gap in nav primitive parity.
7. **Web `Sheet` primitive: not started.** `DESIGN.md §7.3` flags ⏳. Modal primitive missing on web.
8. **Logo: still placeholder SVG.** `BRAND.md` says "Replace with the final mark when designed." Still unbuilt.
9. **Onboarding flow: not in `DESIGN.md`.** High-impact first impression undocumented; route exists at `apps/web/src/app/[locale]/(app)/onboarding`.
10. **No motion vocabulary doc.** Durations exist in tokens (`fast 80ms / base 120ms / slow 240ms`); choreography (page enter, list stagger, optimistic feedback) unspecified.

## Repo-specific addenda

- **PWA manifest hardcodes `#f4f6ef` and `#526030`** ([apps/web/src/app/manifest.ts:13-14](apps/web/src/app/manifest.ts:13)). Mirrors brand tokens but bypasses them. Tokenize.
- **2 hex literals** flagged in `07-audits/hex-hits.json` — both PWA manifest above.
- **Toast** primitive landed Sprint 21 ([packages/ui-web/src/Toast.tsx](packages/ui-web/src/Toast.tsx), [packages/ui-native/src/Toast.tsx](packages/ui-native/src/Toast.tsx)) — not yet added to component spec inventory or `DESIGN.md §7`.
- **Authenticated dev mode shows "1 error" overlay** in feed snapshot — **reopened 2026-05-12 round 2.** Round 1 closed this based on dev-log silence, but Codex round 2 spotted the badge still present in the 07:43 capture. Root cause confirmed via Playwright console-error probe: `apps/web/src/app/[locale]/(app)/feed/page.tsx:67` throws `ApiRequestError: API 401 AUTH_UNAUTHORIZED` unhandled when the access-token expires. The 401 cascade leaks through to other endpoints (`/notifications/unread-count`, `/auth/stream-token`, `/profiles/me`, `/messaging/rooms`). Re-capturing with a fresh auth fixture clears the visible badge (verified 12:00) but the underlying bug remains: feed page must catch 401 and either redirect to login or render a "session expired" UI. **Fix candidate:** apply the same `ApiRequestError`-→-`toErrorMessage`/redirect pattern used in `jobs/page.tsx` (round-1 Bug 3 fix) to `feed/page.tsx` and any other authenticated page that calls `apiFetchPage` without error mapping.
- ~~**A11y heading-order on `/ar-PS/jobs`** — H3 follows H1, skips H2.~~ **Fixed 2026-05-12** ([apps/web/src/app/[locale]/(app)/jobs/page.tsx:304](apps/web/src/app/%5Blocale%5D/%28app%29/jobs/page.tsx:304)). Job card title `<h3>` → `<p>` with same typography classes (card lives inside a labeled list, no heading needed). Re-ran `pnpm --filter @baydar/web exec playwright test e2e/a11y.spec.ts`: 26 passed, 16 skipped (job-detail conditional, no seeded jobs), 0 failed.
- ~~**Token drift regression** `bg-gray-100` in login Suspense fallback.~~ **Fixed 2026-05-12** → `bg-surface-sunken`. `pnpm lint:tokens` clean.
- **`Toast` row added to `DESIGN.md §7`** (2026-05-12) — was missing despite Sprint 21 ship.

## See also

- `08-pain.md` — subjective walkthrough notes (lead fills).
- `07-audits/parity-matrix.md` — generated component coverage.
- `07-audits/tokens-lint.txt` — token rule status.
- `07-audits/hex-hits.json` — hardcoded hex sweep.
