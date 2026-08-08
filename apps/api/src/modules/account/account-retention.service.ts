import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import { RESTORE_GRACE_MS } from "./account-retention";

export interface RetentionReport {
  scannedAt: string;
  cutoff: string;
  dryRun: boolean;
  deletedCount: number;
  deletedUserIds: string[];
  /** Expired idempotency records swept in the same run. */
  idempotencyRecordsSwept: number;
}

@Injectable()
export class AccountRetentionService {
  private readonly logger = new Logger(AccountRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runRetention(options: { now?: Date; dryRun?: boolean } = {}): Promise<RetentionReport> {
    const now = options.now ?? new Date();
    const dryRun = options.dryRun ?? false;
    const cutoff = new Date(now.getTime() - RESTORE_GRACE_MS);
    // Swept here rather than in a cron of its own: the table is bounded by a
    // 48-hour TTL and one more DELETE in a job that already runs is cheaper
    // than a second scheduled task nobody remembers to provision.
    const idempotencyRecordsSwept = await this.sweepIdempotency(now, dryRun);

    const candidates = await this.prisma.user.findMany({
      where: {
        deletedAt: { lt: cutoff },
      },
      select: { id: true, deletedAt: true },
    });

    if (candidates.length === 0) {
      this.logger.log(`Retention run: no expired soft-deletes (cutoff=${cutoff.toISOString()}).`);
      return {
        scannedAt: now.toISOString(),
        cutoff: cutoff.toISOString(),
        dryRun,
        deletedCount: 0,
        deletedUserIds: [],
        idempotencyRecordsSwept,
      };
    }

    const ids = candidates.map((c) => c.id);

    if (dryRun) {
      this.logger.log(
        `Retention dry run: ${ids.length} expired soft-deletes eligible (cutoff=${cutoff.toISOString()}); no rows deleted.`,
      );
      return {
        scannedAt: now.toISOString(),
        cutoff: cutoff.toISOString(),
        dryRun: true,
        deletedCount: ids.length,
        deletedUserIds: ids,
        idempotencyRecordsSwept,
      };
    }

    await this.prisma.user.deleteMany({ where: { id: { in: ids } } });

    this.logger.warn(
      `Retention run: hard-deleted ${ids.length} expired soft-deletes (cutoff=${cutoff.toISOString()}).`,
    );

    return {
      scannedAt: now.toISOString(),
      cutoff: cutoff.toISOString(),
      dryRun: false,
      deletedCount: ids.length,
      deletedUserIds: ids,
      idempotencyRecordsSwept,
    };
  }

  /**
   * Delete idempotency records past their expiry.
   *
   * An expired record is already treated as absent by the interceptor, so this
   * reclaims space rather than changing behaviour — which is why a dry run
   * counts them without deleting instead of skipping the query.
   */
  private async sweepIdempotency(now: Date, dryRun: boolean): Promise<number> {
    if (dryRun) {
      return this.prisma.idempotencyRecord.count({ where: { expiresAt: { lte: now } } });
    }
    const { count } = await this.prisma.idempotencyRecord.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    if (count > 0) this.logger.log(`Retention run: swept ${count} expired idempotency record(s).`);
    return count;
  }
}
