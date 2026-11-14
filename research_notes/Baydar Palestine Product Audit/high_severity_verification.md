# Baydar high-severity verification ledger

**Audit date:** 13 November 2026  
**Release verdict:** **NO-GO**

## Scope and evidence limits

This ledger records the completed static audit of the current, uncommitted worktree. No product files were changed and no fresh runtime suite was executed. Historical green results do **not** establish current release readiness.

Payments, session rotation, and all nine mobile findings still have material gaps or defects. Infrastructure source is substantially present, but deployed health and provider behavior remain unverified.

Status meanings:

- **CONFIRMED — static:** the verdict follows directly from current source.
- **PARTLY CONFIRMED:** part of the claim is supported, but a material gap remains.
- **NOT REPRODUCIBLE:** the stated claim is not established by current evidence; this does not necessarily mean the underlying feature is absent.

## 1. Security, payments, and sessions

| Claim | Verdict | Current evidence and impact |
|---|---|---|
| Basic API/browser security controls exist | **CONFIRMED — static** | Helmet, explicit CORS origins, and rejection of wildcard production origins are present (`apps/api/src/main.ts:18-36`, `apps/api/src/config/env.ts:77-88`). This is not proof against application-layer vulnerabilities. |
| Checkout enforces user/company scope | **CONFIRMED — static** | Employer purchases require `OWNER` or `ADMIN`; invoices are associated with the authenticated scope (`apps/api/src/modules/billing/billing.service.ts:475-514`). |
| Payment activation validates the provider result | **CONFIRMED — static** | HyperPay data is decrypted and the payment is retrieved and matched against invoice ID, amount, currency, and provider payment ID (`apps/api/src/modules/billing/billing.service.ts:316-374`). Live HyperPay acceptance was not tested. |
| Payment creation/retry is idempotent | **PARTLY CONFIRMED** | Invoice activation uses an atomic `OPEN → PAID` claim and duplicate activation returns the existing invoice (`apps/api/src/modules/billing/billing.service.ts:388-455`). **However, checkout itself has no idempotency key or duplicate-request guard**: every invocation creates a new subscription and invoice (`apps/api/src/modules/billing/billing.service.ts:98-124`). Retries can create duplicate open invoices and provider checkouts. **Release blocker for paid payments.** |
| Refresh tokens rotate and web tokens are HttpOnly | **CONFIRMED — static** | Opaque 48-byte refresh tokens are hashed before storage; cookie responses redact the refresh token from JSON (`apps/api/src/modules/auth/auth.service.ts:155-212`, `apps/api/src/modules/auth/auth.controller.ts:245-266`). Password reset also revokes existing refresh tokens (`apps/api/src/modules/auth/auth-tokens.service.ts:226-253`). |
| Refresh rotation is safe under concurrent/replayed requests | **PARTLY CONFIRMED** | Rotation is a read followed by a separate update, without an atomic consume predicate or transaction (`apps/api/src/modules/auth/auth.service.ts:94-115`). Parallel use of the same valid token can pass the initial lookup before either request revokes it. Reuse of an old token produces unauthorized, but does not trigger reuse detection or revoke the descendant session. Add atomic consumption and concurrency tests before calling sessions release-safe. |
| Mobile export proves a bearer-token disclosure | **NOT REPRODUCIBLE** | Export reads the raw stored access token and bypasses the shared fresh-token path (`apps/mobile/app/(app)/settings/account.tsx:24-54`), which explains the reliability finding below. The source alone does **not** show that the token is written into the export or disclosed to another party. Treat this as hardening/reliability, not a confirmed data breach. |
| Live security/provider behavior is verified | **NOT REPRODUCIBLE** | No fresh penetration test, malicious-provider test, cookie browser test, or concurrent session test supports that claim. |

## 2. Mobile M1–M9 dispositions

All statuses below are **static source confirmations**, not device-runtime confirmations.

| ID | Verdict | Corrected disposition |
|---|---|---|
| **M1 — Karama retry identity** | **CONFIRMED — high** | A new idempotency key is generated on every redemption call (`apps/mobile/app/(app)/me/karama/index.tsx:48-56`). If the first request succeeds but its response is lost, retrying can deduct points again. Client retry identity must survive the ambiguous attempt. |
| **M2 — Settings unreachable** | **CONFIRMED — high** | The settings hub contains links, but no ordinary profile/shell route reaches it (`apps/mobile/app/(app)/settings/index.tsx:20-48`; profile links are limited at `apps/mobile/app/(app)/me/index.tsx:142-168`; settings routes are hidden at `apps/mobile/app/(app)/_layout.tsx:305-310`). Notification preferences and other settings therefore lack a normal in-app entry point. |
| **M3 — Employer journeys missing** | **CONFIRMED — high, wording corrected** | Employer list, job, applicant, and status-update surfaces **exist** (`apps/mobile/app/(app)/employer/index.tsx:22-85` and child routes). The defect is **discoverability**: no normal app navigation references `/employer`; only hidden route declarations exist (`apps/mobile/app/(app)/_layout.tsx:313-315`). Do not describe the entire employer feature as absent. |
| **M4 — Message history truncated** | **CONFIRMED — high** | The thread requests `limit=30`, reverses that page, and discards its cursor (`apps/mobile/src/components/messages/useRoomThread.ts:64-75`). Messaging itself works in source, but older history cannot be loaded. |
| **M5 — Locale cannot be selected/restored** | **CONFIRMED — medium** | A language toggle exists but is unreferenced, and startup does not call the stored-locale loader. `loadStoredAppLocale` is exported at `apps/mobile/src/i18n/index.ts:40-45`, while the root layout only imports i18n for side effects (`apps/mobile/app/_layout.tsx:28-29`). Device rendering, Arabic layout, and restart behavior were not tested. |
| **M6 — Transient refresh failure destroys session** | **CONFIRMED — medium** | Any refresh error clears storage and redirects to login (`apps/mobile/src/lib/api.ts:152-166`). Network failures and server failures are not distinguished from definitive credential rejection. |
| **M7 — Export skips token freshness** | **CONFIRMED — medium** | Export reads the raw token and performs its own request instead of using the shared authenticated/fresh-token path (`apps/mobile/app/(app)/settings/account.tsx:24-54`). This can fail with an expired stored token despite a valid refresh session. It is not, by itself, a confirmed token leak. |
| **M8 — Post deep link drops target** | **CONFIRMED — medium** | `/post/:id` is converted to the feed while the ID is discarded (`apps/mobile/src/lib/linking.ts:49-51`). The feed imports `router` and `useFocusEffect`, not a local-parameter hook (`apps/mobile/app/(app)/feed.tsx:18`). There is no target-post screen or focus behavior. |
| **M9 — Upload failures bypass composer error state** | **CONFIRMED — medium** | The upload path lacks a catch that updates the composer’s localized error state (`apps/mobile/app/(app)/composer.tsx:54-92`). Presign, local-file, and storage PUT failures can therefore escape normal composer error presentation. Actual S3/native-picker behavior remains unverified. |

**Mobile release implication:** these are not all “stale issues already fixed.” M1–M9 remain valid with the corrected wording above. A limited beta is possible only with these exclusions explicitly accepted; it should not be presented as full mobile parity.

## 3. Infrastructure

### Confirmed in source

- ECS/ECR, private service networking, Secrets Manager references, and CloudFront-to-VPC-origin configuration are present (`infrastructure/aws/service.tf:1-86`, `infrastructure/aws/network.tf:47-67`, `infrastructure/aws/secrets.tf:1-16`, `infrastructure/aws/public_access.tf:1-47`).
- RDS is `publicly_accessible = false`, with production multi-AZ, 14-day backups, and deletion protection (`infrastructure/aws/database.tf:28-45`).
- Public HTTPS is not accurately summarized as merely a **“public ALB”**: the current design includes CloudFront and a VPC origin (`infrastructure/aws/public_access.tf:1-47`). This corrects the earlier shorthand rather than asserting that the load balancer is directly public.

### Partly confirmed / unresolved

- **Deployment health is not confirmed.** Source configuration does not prove that Terraform was applied successfully or that API, web, database, and HyperPay currently work.
- **Environment routing needs review.** The web environment uses a fixed CloudFront API URL (`infrastructure/aws/main.tf:70-74`), while the separate ingress configuration contains hardcoded load-balancer/listener/target ARNs (`infrastructure/public-ingress/main.tf:1-162`). This creates environment coupling and drift risk.
- Root Terraform modules do not directly include `infrastructure/aws` or `infrastructure/public-ingress`; those configurations may require separate workflows. Their intended apply order must be documented rather than inferred.

## 4. Corrections and downgrades to preserve

1. **Employer:** the surfaces exist; the confirmed defect is the missing normal entry point, not missing employer functionality.
2. **Messaging:** messaging exists and includes the latest-message window and realtime behavior; the confirmed defect is the missing older-history pagination.
3. **Account export:** raw-token use is a freshness/reliability gap. It is not evidence of a bearer-token export or a confirmed disclosure.
4. **Infrastructure:** replace the oversimplified “public ALB” description with the actual CloudFront/VPC-origin design.
5. **Historical tests:** previous green totals and “all passed” statements remain historical only and were not reproduced in this audit.
6. **Static versus runtime:** static confirmations establish source behavior, not payment-provider, device, browser, cloud, or deployment success.

## 5. Exact verification actions required before changing the verdict

1. **Payments:** add idempotent checkout/retry behavior, then use HyperPay sandbox to prove repeated submission cannot create duplicate invoices/checkouts and cannot activate mismatched payments.
2. **Sessions:** implement atomic refresh consumption and test parallel requests using the same token, old-token replay, logout, and password-reset revocation against a real database.
3. **Mobile:** exercise M1–M9 on Android and iOS, including offline refresh, export with an expired access token, 30+ messages, employer entry from normal navigation, and Arabic relaunch.
4. **Infrastructure:** run formatting/validation and a reviewed plan for each Terraform root, then verify deployed API/web health, database connectivity, and DNS/TLS. Do not treat a plan as deployment verification.
5. **Current quality gates:** rerun type-checking, lint, unit/integration tests, and builds on this exact worktree; previous green runs are historical evidence only.

## Final disposition

**NO-GO** for a release that claims production payments, robust session rotation, completed M1–M9 remediation, or verified infrastructure. A limited mobile beta is possible only with the documented exclusions explicitly accepted and without claiming full mobile parity.

**Not checked:** no live payment, real-device, cloud, or fresh build/test execution was performed. The remaining release risk is precisely in those unverified runtime paths; no commits or product-file changes were made.
