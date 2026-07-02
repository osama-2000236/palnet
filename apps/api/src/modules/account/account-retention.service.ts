import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import { RESTORE_GRACE_MS } from "./account-retention";

export interface RetentionReport {
  scannedAt: string;
  cutoff: string;
  dryRun: boolean;
  deletedCount: number;
  deletedUserIds: string[];
}

@Injectable()
export class AccountRetentionService {
  private readonly logger = new Logger(AccountRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runRetention(options: { now?: Date; dryRun?: boolean } = {}): Promise<RetentionReport> {
    const now = options.now ?? new Date();
    const dryRun = options.dryRun ?? false;
    const cutoff = new Date(now.getTime() - RESTORE_GRACE_MS);
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
    };
  }
}
