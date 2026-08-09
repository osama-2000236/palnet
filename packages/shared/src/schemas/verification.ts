import { z } from "zod";

import { VerificationMethod, VerificationStatus } from "../identity-enums";
import { E164_PATTERN } from "../phone";

// Four ways to prove you are who you say.
//
// LinkedIn verifies with CLEAR and NFC passport reads. Neither operates here,
// and a product that asks for a document it cannot check is asking members to
// upload a photograph of their ID to no purpose. So: a phone that rings, an
// employer domain that accepts mail, a university domain from the table, and a
// professional body a human reviews.
//
// None of them is a blue tick. Each says one specific thing, and the UI names
// which — «رقم مؤكَّد» is not «موثّق».

export const VerificationState = z.object({
  method: z.nativeEnum(VerificationMethod),
  status: z.nativeEnum(VerificationStatus),
  /** The phone tail, email domain, or body key — never the whole credential. */
  evidenceLabel: z.string().nullable(),
  verifiedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
});
export type VerificationState = z.infer<typeof VerificationState>;

export const MyVerifications = z.object({
  verifications: z.array(VerificationState),
});
export type MyVerifications = z.infer<typeof MyVerifications>;

export const StartPhoneVerificationBody = z.object({
  /** Already normalised by the client via `toE164`. */
  phoneE164: z.string().regex(E164_PATTERN, { message: "INVALID_PHONE" }),
});
export type StartPhoneVerificationBody = z.infer<typeof StartPhoneVerificationBody>;

/**
 * What the start call returns.
 *
 * `phoneTail` so the member can tell which of their two SIMs it went to;
 * `expiresAt` so the countdown is the server's opinion, not the client's; and
 * `resendAfter` so the button knows when to come back rather than guessing.
 */
export const OtpChallenge = z.object({
  phoneTail: z.string().length(4),
  expiresAt: z.string().datetime(),
  resendAfter: z.string().datetime(),
});
export type OtpChallenge = z.infer<typeof OtpChallenge>;

export const ConfirmPhoneVerificationBody = z.object({
  phoneE164: z.string().regex(E164_PATTERN, { message: "INVALID_PHONE" }),
  /** Six digits. Folded from Arabic-Indic by the client before it is sent. */
  code: z.string().regex(/^\d{6}$/, { message: "INVALID_CODE" }),
});
export type ConfirmPhoneVerificationBody = z.infer<typeof ConfirmPhoneVerificationBody>;

/**
 * One endpoint for both email paths.
 *
 * The domain decides which: a university domain from `PS_UNIVERSITIES` is an
 * EDU_EMAIL, anything else is a WORK_EMAIL. Making the client declare which it
 * wants would let it declare wrong.
 */
export const StartEmailDomainVerificationBody = z.object({
  email: z.string().email().max(254),
});
export type StartEmailDomainVerificationBody = z.infer<typeof StartEmailDomainVerificationBody>;

export const EmailDomainChallenge = z.object({
  method: z.enum(["WORK_EMAIL", "EDU_EMAIL"]),
  domain: z.string(),
  expiresAt: z.string().datetime(),
});
export type EmailDomainChallenge = z.infer<typeof EmailDomainChallenge>;

export const ConfirmEmailDomainVerificationBody = z.object({
  /** The opaque token from the emailed link. Not a six-digit code: an inbox is
   *  not a phone, and a link is one tap instead of a transcription. */
  token: z.string().min(20).max(200),
});
export type ConfirmEmailDomainVerificationBody = z.infer<typeof ConfirmEmailDomainVerificationBody>;

/**
 * The manual path. A member names their body and membership number, and a human
 * checks it against the register.
 *
 * Deliberately slow and deliberately human: نقابة registers are not APIs, and
 * an automated "verification" that checks nothing would be the most damaging
 * badge on the platform.
 */
export const RequestBodyVerificationBody = z.object({
  bodyKey: z.string().min(1).max(80),
  membershipNumber: z.string().min(1).max(60),
  occupationKey: z.string().min(1).max(80),
  note: z.string().max(1000).optional(),
});
export type RequestBodyVerificationBody = z.infer<typeof RequestBodyVerificationBody>;

/**
 * Rate limits, in one place so the service and the copy agree.
 *
 * An SMS costs money and a code sent twice is a code an attacker can guess
 * twice. Three per hour is generous for a member who mistyped their number and
 * miserly for anybody enumerating.
 */
export const OTP_LIMITS = {
  START_PER_HOUR_PER_USER: 3,
  START_PER_DAY_PER_PHONE: 5,
  /** After this many wrong codes the row burns and a new one must be started. */
  MAX_CONFIRM_ATTEMPTS: 5,
  CODE_TTL_MINUTES: 10,
  RESEND_COOLDOWN_SECONDS: 60,
} as const;

/** An email link lives longer than an SMS code: an inbox is checked less often. */
export const EMAIL_VERIFICATION_TTL_HOURS = 24;
