# Design

## Boundary
Modify the existing HyperPay billing path, its checkout callers, refresh rotation, Prisma persistence, and focused tests. Do not redesign authentication or invoice processing.

## Payment identity
Add `idempotencyKey` to the checkout request as a client-generated opaque identifier (8–128 characters). The server hashes the key with SHA-256 and persists the hash, never the raw key, together with a canonical fingerprint of user, plan, company, interval, method, amount, and currency.

The invoice becomes the idempotency record:
- `checkoutKeyHash`: nullable unique string for legacy/manual invoices.
- `checkoutFingerprint`: nullable string, compared before replay.
- `providerInvoiceId`: existing HyperPay checkout identifier.
- Existing invoice fields remain authoritative for response construction.

Creation flow:
1. Validate and authorize the request.
2. Compute key hash and fingerprint.
3. Look up by key hash. Return an existing complete checkout when the fingerprint matches; reject mismatches with HTTP 409.
4. Otherwise create the incomplete invoice/subscription with the identity fields. A unique-key collision re-reads the existing record and applies the same replay/conflict rules.
5. Call HyperPay only after the incomplete invoice exists. Persist the returned provider ID before responding.
6. On provider failure, retain the incomplete invoice and allow the same request to retry; do not return a successful checkout.

Because two racing requests can both reach the external provider before the unique collision is resolved, serialize the invoice-identity creation in the database transaction and use a database uniqueness violation before the provider call. The implementation test simulates serialization through the existing Prisma seam. Any remaining provider-side race is documented as a launch-blocking sandbox test requirement.

## Checkout response
Replays construct the same response shape from the stored invoice and provider ID. Bank-transfer and wallet responses retain their existing formats. Unsupported one-time/replay response data is not fabricated.

## Refresh
Keep `issueSession` persistence unchanged. Replace `findFirst` plus `update` with one conditional `updateMany` consuming a matching, unrevoked, unexpired token/device record. Only a changed row proves ownership of rotation. Zero changed rows returns the existing unauthorized response without issuing replacement tokens. Successful consumption proceeds through the existing `issueSession` method.

## Files
- `packages/shared/src/schemas/billing.ts`: request key validation.
- `packages/db/prisma/schema.prisma` and a migration: checkout identity columns/index.
- `apps/api/src/modules/billing/billing.controller.ts`: pass optional header/body identity into service.
- `apps/api/src/modules/billing/billing.service.ts`: replay/conflict/retry behavior and conditional rotation.
- Existing web checkout API client/caller: generate and reuse a key for one checkout intent.
- `apps/api/src/modules/billing/billing.service.spec.ts` and `apps/api/src/modules/auth/auth.service.spec.ts`: regression coverage.

## Verification
Run targeted Jest suites, API typecheck/lint, schema validation, and a diff review. No production payment enablement, device test, deployment, or HyperPay sandbox claim is included.
