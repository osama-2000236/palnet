import type { Prisma } from "@baydar/db";
import { ErrorCode } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { jobLimitFromFeatures } from "./pricing";

@Injectable()
export class EmployerEntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  // Callers that create a job must pass their transaction client and hold the
  // per-company advisory lock (see CompaniesService.createJob) so the limit
  // check, credit spend, and job insert are one atomic unit.
  async assertCanCreateJob(
    companyId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const activeJobs = await db.job.count({
      where: { companyId, isActive: true, deletedAt: null },
    });
    const limit = await this.activeJobLimit(companyId, db);
    if (activeJobs < limit) return;

    // Atomic conditional decrement: at most one concurrent caller wins the
    // row, even under racing parallel requests. We retry by picking the next
    // eligible credit if the conditional update missed.
    const candidate = await db.employerCredit.findFirst({
      where: {
        companyId,
        kind: "JOB_POST",
        remaining: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { expiresAt: "asc" },
      select: { id: true },
    });
    if (candidate) {
      const decremented = await db.employerCredit.updateMany({
        where: {
          id: candidate.id,
          remaining: { gt: 0 },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { remaining: { decrement: 1 } },
      });
      if (decremented.count === 1) return;
    }

    throw new DomainException(
      ErrorCode.VALIDATION_FAILED,
      `Active job limit reached (${activeJobs}/${limit}). Upgrade plan or buy job credits.`,
      402,
    );
  }

  async activeJobLimit(
    companyId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    const sub = await db.subscription.findFirst({
      where: {
        companyId,
        status: "ACTIVE",
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: new Date() } }],
      },
      orderBy: { currentPeriodEnd: "desc" },
      include: { plan: true },
    });
    return jobLimitFromFeatures(sub?.plan.features);
  }
}
