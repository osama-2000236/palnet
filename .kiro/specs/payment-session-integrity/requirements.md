# Requirements

## Problem
Checkout creation is not idempotent and refresh-token rotation lacks an atomic consume operation. This can create duplicate charges/subscriptions or allow a refresh token to be used more than once.

## Scope
In scope: card checkout retries, HyperPay transaction creation, invoice ownership, refresh-token rotation, and focused regression tests.
Out of scope: payment-provider UI changes, webhook redesign, general auth/session policy changes, and unrelated billing features.

## Functional requirements

### FR-1 Checkout request identity
- Each checkout attempt SHALL carry a server-validated idempotency key.
- The key SHALL be bound to the authenticated user, plan, company scope, billing interval, and payment method.
- Reusing a key with different checkout parameters SHALL be rejected without creating provider or invoice records.

### FR-2 Existing checkout replay
- Repeating the same checkout request SHALL return the original provider checkout and invoice identifiers.
- A replay SHALL NOT create another HyperPay checkout, subscription, or invoice.

### FR-3 Incomplete retry
- If checkout creation fails before provider details are persisted, a safe retry MAY create a new provider checkout for the same request key.
- A failed attempt SHALL NOT be treated as a successful checkout.

### FR-4 Concurrent equivalent requests
- Concurrent requests with the same key and parameters SHALL resolve to one logical checkout.
- Database uniqueness SHALL enforce the request identity; application checks alone SHALL NOT be relied upon.

### FR-5 Invoice ownership
- Checkout lookup and replay SHALL be restricted to the authenticated owner and the original checkout parameters.

### FR-6 Refresh rotation
- A valid refresh token SHALL be consumed exactly once before its replacement is issued.
- Concurrent or later uses of the consumed token SHALL be rejected.
- Token hashing, expiry, user validation, and current client response contracts SHALL be preserved.

### FR-7 Compatibility
- Existing checkout request fields SHALL continue to work, with an optional idempotency key supplied by newer clients when necessary.
- API responses SHALL remain compatible with existing web clients.

## Non-functional requirements

### NFR-1 Durability
Checkout identity and token consumption SHALL survive retries and process boundaries through persisted unique/atomic database operations.

### NFR-2 Least side effects
Rejected, duplicate, or replayed requests SHALL NOT cause additional provider calls or financial side effects.

### NFR-3 Verification
Focused tests SHALL cover replay, key/parameter mismatch, concurrent checkout, successful rotation, and token reuse. Existing billing/auth suites SHALL remain green.

## Acceptance criteria
1. A checkout retry returns the same invoice/provider checkout without an extra HyperPay call.
2. Conflicting reuse of a request key is rejected before provider side effects.
3. Two equivalent concurrent checkout requests create one logical checkout.
4. One of two concurrent uses of a refresh token succeeds and the other is rejected.
5. A previously rotated refresh token cannot be reused.
