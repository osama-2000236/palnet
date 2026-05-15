import { ErrorCode } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

export type ModerationActionKind = "DISMISS" | "WARN" | "SUSPEND" | "HARD_DELETE";

@Injectable()
export class AdminModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async listReports(status: "open" | "resolved" | "all", limit: number) {
    return this.prisma.report.findMany({
      where:
        status === "all"
          ? {}
          : status === "open"
            ? { resolvedAt: null }
            : { resolvedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async getReport(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new DomainException(ErrorCode.NOT_FOUND, "Report not found.", 404);
    return report;
  }

  async act(input: {
    actorId: string;
    reportId: string;
    action: ModerationActionKind;
    note?: string;
  }) {
    const report = await this.getReport(input.reportId);
    const note = input.note ?? null;

    await this.prisma.$transaction(async (tx) => {
      await tx.moderationAction.create({
        data: {
          actorId: input.actorId,
          reportId: input.reportId,
          action: input.action,
          note,
          targetUserId: report.targetUserId,
        },
      });

      if (input.action === "SUSPEND" && report.targetUserId) {
        await tx.user.update({
          where: { id: report.targetUserId },
          data: { isActive: false },
        });
      }
      if (input.action === "HARD_DELETE" && report.targetUserId) {
        await tx.user.delete({ where: { id: report.targetUserId } });
      }

      await tx.report.update({
        where: { id: input.reportId },
        data: { resolvedAt: new Date(), resolvedNote: `${input.action}${note ? `: ${note}` : ""}` },
      });
    });

    return this.getReport(input.reportId);
  }
}
