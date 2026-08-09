import { z } from "zod";

import { LicenceStatus, PracticeStatus } from "../occupations";
import { WorkProofStatus } from "../enums";
import { E164_PATTERN } from "../phone";

// One finished unit of work, and somebody else saying it happened.
//
// THE evidence primitive. A standing is a summary of these; the evidence score
// weights them; the craft directory orders by them. Everything in WS-01 that is
// not self-reported reduces to a counterparty pressing confirm.
//
// Most work in this market is done for somebody who is not on Baydar. A proof
// system that only counted registered counterparties would refuse to see the
// majority of the work it exists to record — hence the phone path, which is
// worth exactly as much as the in-app one.

export const WorkProofCounterparty = z.object({
  kind: z.enum(["USER", "COMPANY", "PHONE"]),
  /** Null on the PHONE path: there is no account, and the number is not shown. */
  id: z.string().cuid().nullable(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
});
export type WorkProofCounterparty = z.infer<typeof WorkProofCounterparty>;

export const WorkProof = z.object({
  id: z.string().cuid(),
  workerId: z.string().cuid(),
  counterparty: WorkProofCounterparty,
  occupationKey: z.string(),
  jobId: z.string().cuid().nullable(),
  applicationId: z.string().cuid().nullable(),
  city: z.string().nullable(),
  summary: z.string().nullable(),
  status: z.nativeEnum(WorkProofStatus),
  completedAt: z.string().datetime().nullable(),
  confirmExpiresAt: z.string().datetime().nullable(),
  confirmedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type WorkProof = z.infer<typeof WorkProof>;

/**
 * Filing a proof. Exactly one counterparty, named three possible ways.
 *
 * The refinement is the whole safety property: a proof with no counterparty is
 * a self-report, and a proof with two is ambiguous about who may confirm it.
 */
export const CreateWorkProofBody = z
  .object({
    occupationKey: z.string().min(1).max(80),
    clientUserId: z.string().cuid().optional(),
    clientCompanyId: z.string().cuid().optional(),
    /** For a client who is not on Baydar. Hashed on arrival; never stored raw. */
    clientPhoneE164: z.string().regex(E164_PATTERN, { message: "INVALID_PHONE" }).optional(),
    jobId: z.string().cuid().optional(),
    applicationId: z.string().cuid().optional(),
    city: z.string().max(120).optional(),
    summary: z.string().max(2000).optional(),
    completedAt: z.string().datetime(),
  })
  .refine(
    (b) => [b.clientUserId, b.clientCompanyId, b.clientPhoneE164].filter(Boolean).length === 1,
    { message: "WORK_PROOF_NEEDS_EXACTLY_ONE_COUNTERPARTY", path: ["clientUserId"] },
  );
export type CreateWorkProofBody = z.infer<typeof CreateWorkProofBody>;

/**
 * Confirming. Either an authenticated counterparty, or a one-time code sent to
 * the phone number the worker named.
 *
 * The code path carries no session, so the code IS the authorisation — which is
 * why it is single-use, short-lived, and attempt-limited.
 */
export const ConfirmWorkProofBody = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, { message: "INVALID_CODE" })
    .optional(),
});
export type ConfirmWorkProofBody = z.infer<typeof ConfirmWorkProofBody>;

export const DeclineWorkProofBody = z.object({
  reason: z.string().max(600).optional(),
});
export type DeclineWorkProofBody = z.infer<typeof DeclineWorkProofBody>;

/**
 * Disputing one that was already confirmed.
 *
 * A dispute does not delete the proof — it moves it to DISPUTED, which stops it
 * counting and puts it in front of a human. Deletion would let a client erase a
 * worker's history in a disagreement about the last invoice.
 */
export const DisputeWorkProofBody = z.object({
  reason: z.string().min(10).max(2000),
});
export type DisputeWorkProofBody = z.infer<typeof DisputeWorkProofBody>;

export const MyWorkProofsQuery = z.object({
  role: z.enum(["worker", "client"]).default("worker"),
  status: z.nativeEnum(WorkProofStatus).optional(),
});
export type MyWorkProofsQuery = z.infer<typeof MyWorkProofsQuery>;

/** How long a counterparty has to answer before the request lapses. */
export const WORK_PROOF_CONFIRM_WINDOW_DAYS = 30;

// ──────────────────────────────────────────────────────────────────────────
// Vouches and licences — the two things that are not a work proof
// ──────────────────────────────────────────────────────────────────────────

export const CreateVouchBody = z.object({
  voucheeId: z.string().cuid(),
  occupationKey: z.string().min(1).max(80),
  note: z.string().max(600).optional(),
});
export type CreateVouchBody = z.infer<typeof CreateVouchBody>;

export const Vouch = z.object({
  id: z.string().cuid(),
  voucherId: z.string().cuid(),
  voucheeId: z.string().cuid(),
  occupationKey: z.string(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type Vouch = z.infer<typeof Vouch>;

/**
 * Declaring a statutory licence. Always created DECLARED.
 *
 * Baydar verifies licences; it never invents a rank beside a نقابة. A member
 * cannot post one already verified, and no amount of paying changes that.
 */
export const CreateLicenceBody = z.object({
  occupationKey: z.string().min(1).max(80),
  bodyKey: z.string().min(1).max(80),
  number: z.string().max(60).optional(),
  companyId: z.string().cuid().optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});
export type CreateLicenceBody = z.infer<typeof CreateLicenceBody>;

export const Licence = z.object({
  id: z.string().cuid(),
  occupationKey: z.string(),
  bodyKey: z.string(),
  number: z.string().nullable(),
  status: z.nativeEnum(LicenceStatus),
  practice: z.nativeEnum(PracticeStatus),
  issuedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  verifiedAt: z.string().datetime().nullable(),
});
export type Licence = z.infer<typeof Licence>;

export const ClaimOccupationBody = z.object({
  occupationKey: z.string().min(1).max(80),
  declaredYears: z.number().int().min(0).max(70).optional(),
  isPrimary: z.boolean().optional(),
});
export type ClaimOccupationBody = z.infer<typeof ClaimOccupationBody>;
