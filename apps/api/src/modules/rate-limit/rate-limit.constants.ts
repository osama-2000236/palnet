export const RATE_LIMIT_KEY = "baydar:rate-limit";

// Buckets, in @nestjs/throttler's units (ttl in ms). Every handler tagged with
// the same bucket spends one shared budget — see BaydarThrottlerGuard.
export const RATE_LIMITS = {
  media: { limit: 30, ttl: 60 * 60 * 1000 },
  search: { limit: 60, ttl: 60 * 1000 },
  contentCreate: { limit: 30, ttl: 60 * 60 * 1000 },
  messagingSend: { limit: 120, ttl: 60 * 1000 },
  pushDeviceRegister: { limit: 10, ttl: 60 * 60 * 1000 },
  safetyAction: { limit: 30, ttl: 60 * 60 * 1000 },
} as const;

export type RateLimitClass = keyof typeof RATE_LIMITS;
