// Generates a cross-platform idempotency key suitable for POST /karama/redeem,
// POST /billing/checkout-session, etc. Prefers globalThis.crypto.randomUUID()
// when Hermes/RN exposes it (Expo SDK 54 + RN 0.81 do); otherwise falls back to
// a timestamp + double Math.random() base36 so we never block on a missing
// global. Idempotency only needs ~64 bits of entropy in practice.
export function makeIdempotencyKey(prefix?: string): string {
  const cryptoGlobal = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const uuid =
    typeof cryptoGlobal?.randomUUID === "function"
      ? cryptoGlobal.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random()
          .toString(36)
          .slice(2, 10)}`;
  return prefix ? `${prefix}-${uuid}` : uuid;
}
