export const RESTORE_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export function isWithinRestoreGrace(deletedAt: Date, now: Date): boolean {
  return now.getTime() - deletedAt.getTime() <= RESTORE_GRACE_MS;
}
