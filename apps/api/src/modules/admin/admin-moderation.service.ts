import { ErrorCode, NotificationType } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { KaramaService } from "../karama/karama.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

export type ModerationActionKind = "DISMISS" | "WARN" | "SUSPEND" | "HARD_DELETE";

@Injectable()
export class AdminModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly karama: KaramaService,
    private readonly notifications: NotificationsService,
  ) {}

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
    // Stale-item guard: a report is resolved exactly once. A second operator
    // acting on the same report gets a conflict instead of duplicate audit
    // rows, duplicate reporter notifications, or a crash re-deleting a user.
    if (report.resolvedAt) {
      throw new DomainException(ErrorCode.CONFLICT, "Report is already resolved.", 409);
    }
    const note = input.note ?? null;

    await this.prisma.$transaction(async (tx) => {
      // Conditional claim: only the first operator resolves the report. A
      // concurrent second operator aborts the whole transaction with 409.
      const claimed = await tx.report.updateMany({
        where: { id: input.reportId, resolvedAt: null },
        data: { resolvedAt: new Date(), resolvedNote: `${input.action}${note ? `: ${note}` : ""}` },
      });
      if (claimed.count === 0) {
        throw new DomainException(ErrorCode.CONFLICT, "Report is already resolved.", 409);
      }

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
      if (input.action === "HARD_DELETE" && report.targetPostId) {
        await tx.post.update({
          where: { id: report.targetPostId },
          data: { deletedAt: new Date() },
        });
      } else if (input.action === "HARD_DELETE" && report.targetUserId) {
        await tx.user.delete({ where: { id: report.targetUserId } });
      }
    });

    // Reward the reporter when the report led to a real moderator action.
    // DISMISS does not reward — would invite false-report spam.
    if (input.action !== "DISMISS") {
      void this.karama.award({
        userId: report.reporterId,
        reason: "REPORT_UPHELD",
        refType: "report",
        refId: report.id,
      });
    }

    await this.notifications.notify({
      type: NotificationType.MODERATION_ACTION,
      recipientId: report.reporterId,
      actorId: input.actorId,
      postId: report.targetPostId,
      data: {
        reportId: report.id,
        action: input.action,
        upheld: input.action !== "DISMISS",
      },
      dedupe: true,
    });

    return this.getReport(input.reportId);
  }
}
