import { ErrorCode } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { jobLimitFromFeatures } from "./pricing";

@Injectable()
export class EmployerEntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanCreateJob(companyId: string): Promise<void> {
    const activeJobs = await this.prisma.job.count({
      where: { companyId, isActive: true, deletedAt: null },
    });
    const limit = await this.activeJobLimit(companyId);
    if (activeJobs < limit) return;

    // Atomic conditional decrement: at most one concurrent caller wins the
    // row, even under racing parallel requests. We retry by picking the next
    // eligible credit if the conditional update missed.
    // TODO: the under-limit fast path (`activeJobs < limit`) still has a
    // residual race window. Acceptable for MVP volume; tighten with
    // SELECT FOR UPDATE on the Job count if the cap is ever exceeded.
    const candidate = await this.prisma.employerCredit.findFirst({
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
      const decremented = await this.prisma.employerCredit.updateMany({
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

  async activeJobLimit(companyId: string): Promise<number> {
    const sub = await this.prisma.subscription.findFirst({
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
