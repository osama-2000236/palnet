import type { Prisma } from "@baydar/db";

export const RESTORE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export function isWithinRestoreGrace(deletedAt: Date, now: Date): boolean {
  return now.getTime() - deletedAt.getTime() <= RESTORE_GRACE_MS;
}

/**
 * An account still inside its restore grace that parked `email` in its
 * deletion snapshot. The unique index no longer sees that email, so register
 * has to: a signup taking it would make the owner's restore collide.
 */
export function pendingDeletionHolding(email: string, now = Date.now()): Prisma.UserWhereInput {
  return {
    deletedAt: { gt: new Date(now - RESTORE_GRACE_MS) },
    pendingDeletionSnapshot: { path: ["email"], equals: email },
  };
}
