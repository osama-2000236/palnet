import { Injectable, Logger } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

import { RESTORE_GRACE_MS } from "./account-retention";

export interface RetentionReport {
  scannedAt: string;
  deletedCount: number;
  deletedUserIds: string[];
}

@Injectable()
export class AccountRetentionService {
  private readonly logger = new Logger(AccountRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async runRetention(now: Date = new Date()): Promise<RetentionReport> {
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
        deletedCount: 0,
        deletedUserIds: [],
      };
    }

    const ids = candidates.map((c) => c.id);
    await this.prisma.user.deleteMany({ where: { id: { in: ids } } });

    this.logger.warn(
      `Retention run: hard-deleted ${ids.length} expired soft-deletes (cutoff=${cutoff.toISOString()}).`,
    );

    return {
      scannedAt: now.toISOString(),
      deletedCount: ids.length,
      deletedUserIds: ids,
    };
  }
}
