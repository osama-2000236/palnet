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

    const credit = await this.prisma.employerCredit.findFirst({
      where: {
        companyId,
        kind: "JOB_POST",
        remaining: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { expiresAt: "asc" },
      select: { id: true, remaining: true },
    });
    if (credit) {
      await this.prisma.employerCredit.update({
        where: { id: credit.id },
        data: { remaining: credit.remaining - 1 },
      });
      return;
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
