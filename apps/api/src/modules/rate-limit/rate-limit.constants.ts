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
  // An SMS costs real money and a code sent twice is a code guessable twice.
  // Three an hour is generous for somebody who mistyped their number and
  // miserly for anybody enumerating. Mirrors OTP_LIMITS in @baydar/shared,
  // which is what the copy reads.
  otpStart: { limit: 3, ttl: 60 * 60 * 1000 },
  // The confirm path is attempt-limited per OTP row as well; this bucket only
  // stops somebody spraying codes across many rows from one session.
  otpConfirm: { limit: 20, ttl: 60 * 60 * 1000 },
  // Rendering a CV is a Puppeteer-free but still measurable amount of work, and
  // it is a public-ish route. Ten an hour is more than any real reader needs.
  cvRender: { limit: 10, ttl: 60 * 60 * 1000 },
} as const;

export type RateLimitClass = keyof typeof RATE_LIMITS;
