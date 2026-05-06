export const RATE_LIMIT_KEY = "baydar:rate-limit";

export const RATE_LIMITS = {
  media: { limit: 30, windowMs: 60 * 60 * 1000 },
  search: { limit: 60, windowMs: 60 * 1000 },
  contentCreate: { limit: 30, windowMs: 60 * 60 * 1000 },
  messagingSend: { limit: 120, windowMs: 60 * 1000 },
  pushDeviceRegister: { limit: 10, windowMs: 60 * 60 * 1000 },
  safetyAction: { limit: 30, windowMs: 60 * 60 * 1000 },
} as const;

export type RateLimitClass = keyof typeof RATE_LIMITS;
