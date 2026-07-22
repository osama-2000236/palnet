# Security scan + fixes — 2026-07-22

Source-code audit of Baydar (Nest API + shared contracts) using bb-local-toolkit
impact rules: only bugs with practical harm, then fixed with line-level QA tests.

## Findings (7-Question Gate)

| # | Class | Location | Impact | Gate | Action |
|---|-------|----------|--------|------|--------|
| 1 | Payment webhook fail-open | `hyperpay.client.ts` `verifyWebhookSignature` | Unsigned HyperPay webhook → free premium when secret missing | PASS | **Fixed** fail-closed |
| 2 | Open redirect (payment return) | `CheckoutSessionBody.returnUrl` → HyperPay `shopperResultUrl` | Post-pay redirect to attacker origin → phishing | PASS | **Fixed** origin allowlist |
| 3 | Refresh token race / reuse | `AuthService.refresh` | Concurrent refresh could mint two sessions; no family burn on reuse | PASS | **Fixed** atomic claim + burn |
| 4 | JWT alg not pinned | `jwt.sign` / `jwt.verify` | Defense-in-depth vs alg confusion | PASS (hardening) | **Fixed** HS256 pin |
| 5 | Insecure media URL schemes | `SendMessageBody.mediaUrl` | `javascript:` / `http:` / `data:` in DMs | PASS (Medium) | **Fixed** HTTPS-only |
| 6 | Messaging correctness (pre-existing WIP) | `messaging.service.ts` | Archive black-hole, P2002 500, dual DM rooms, blank body | Correctness | **Verified** + tests |

### Explicit kills (not bugs / not fixed here)

- Health version disclosure — Info only
- GraphQL introspection — N/A (REST)
- CORS wildcards in prod — already rejected by `loadEnv`
- HyperPay secret required in production env — true, but fail-open still dangerous for staging/misconfig

## Fixes → test map (every changed line path)

| Change | Tests |
|--------|--------|
| Webhook fail-closed | `hyperpay.client.spec.ts` (missing secret, missing sig, forged, valid, body-mismatch) |
| returnUrl allowlist | `billing.service.spec.ts` (evil origin, credentials-in-URL) |
| Atomic refresh + reuse burn | `auth.service.spec.ts` (happy path, reuse, unknown token) |
| HS256 pin sign+verify | `auth.service.spec.ts` header assert; `jwt-auth.guard.spec.ts` (valid, alg=none, missing) |
| HTTPS mediaUrl | `packages/shared/src/schemas/message.spec.ts` |
| Messaging WIP | `messaging.service.spec.ts` (block open-DM, blank body, P2002, archive clear) |

## Verification commands run

```powershell
pnpm --filter @baydar/shared test
pnpm --filter @baydar/api test -- hyperpay.client.spec auth.service.spec jwt-auth.guard.spec billing.service.spec messaging.service.spec
pnpm --filter @baydar/shared type-check
pnpm --filter @baydar/api type-check
pnpm --filter @baydar/api lint
```

Results: all green (lint warnings fixed on new specs).

## Residual risks

- `returnUrl` allowlist depends on `BAYDAR_WEB_URL` / `CORS_ORIGINS` being correct in each env.
- Media host is HTTPS-only, not R2-host-only (CDN host pinning can come later).
- Refresh reuse burns all user sessions (intentional; slight UX hit on rare double-tab races).
- Uncommitted messaging client work still needs independent product QA per `MESSAGING-FIXES-2026-07-14.md`.
