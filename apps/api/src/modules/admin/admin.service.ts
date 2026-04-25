import { Injectable } from "@nestjs/common";
import { Prisma } from "@palnet/db";
import {
  type AdminPostDetail,
  type AdminUserDetail,
  type AppealAck,
  type AuditActor,
  type AuditLogExportQuery,
  type AuditLogItem,
  type AuditLogListQuery,
  type AuditLogPage,
  AuditAction,
  type CursorPageMeta,
  ErrorCode,
  NotificationType,
  type ReviewAppealBody,
  type RestorePostBody,
  type SuspendUserBody,
  type TakedownPostBody,
  type UnsuspendUserBody,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

// Admin depth — operator actions on users, posts, and report appeals plus
// the audit log that records every one of those actions.
//
// Rules:
// - Every mutation writes an AuditLog row in the same transaction as the
//   effect. No silent admin actions.
// - Suspensions/takedowns are soft (nullable timestamp). Restoring clears
//   the timestamp; the reason string stays on the row for posterity.
// - Appeals are one-per-report. Filing an appeal flips the status from
//   null → PENDING; reviewing it sets UPHELD/DENIED and, if UPHELD, undoes
//   the originating action (unsuspend user / restore post).
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Users ────────────────────────────────────────────────────────────

  async suspendUser(actorId: string, targetUserId: string, body: SuspendUserBody): Promise<void> {
    if (actorId === targetUserId) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "You can't suspend your own account.",
        400,
      );
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, suspendedAt: true },
    });
    if (!target) throw notFound("User");
    if (target.suspendedAt) {
      // Idempotent-ish: re-suspending is a no-op except it refreshes the
      // reason + issuer. Makes operator flows forgiving.
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: {
          suspendedAt: new Date(),
          suspendedReason: body.reason,
          suspendedById: actorId,
        },
        select: { id: true },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: AuditAction.USER_SUSPEND,
          targetUserId,
          note: body.reason,
        },
      }),
      // Revoke all active refresh tokens so the session is invalidated
      // on next refresh. Access tokens still work until expiry (~15m);
      // SuspensionGuard catches those on writes.
      this.prisma.refreshToken.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    // Tell the user why they're locked out. `notify` already swallows its
    // own errors, so a notifications failure can't unwind the suspension.
    await this.notifications.notify({
      type: NotificationType.MODERATION_USER_SUSPENDED,
      recipientId: targetUserId,
      actorId,
      data: { reason: body.reason },
    });
  }

  async unsuspendUser(
    actorId: string,
    targetUserId: string,
    body: UnsuspendUserBody,
  ): Promise<void> {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, suspendedAt: true },
    });
    if (!target) throw notFound("User");
    if (!target.suspendedAt) return; // idempotent no-op

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: {
          suspendedAt: null,
          suspendedReason: null,
          suspendedById: null,
        },
        select: { id: true },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: AuditAction.USER_UNSUSPEND,
          targetUserId,
          note: body.note ?? null,
        },
      }),
    ]);

    await this.notifications.notify({
      type: NotificationType.MODERATION_USER_UNSUSPENDED,
      recipientId: targetUserId,
      actorId,
      data: body.note ? { note: body.note } : null,
    });
  }

  // ── Posts ────────────────────────────────────────────────────────────

  async takedownPost(actorId: string, postId: string, body: TakedownPostBody): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, takedownAt: true, authorId: true },
    });
    if (!post) throw notFound("Post");
    if (post.takedownAt) {
      // Same story as suspend — refresh reason + issuer, no error.
    }

    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: postId },
        data: {
          takedownAt: new Date(),
          takedownReason: body.reason,
          takedownById: actorId,
        },
        select: { id: true },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: AuditAction.POST_TAKEDOWN,
          targetPostId: postId,
          note: body.reason,
        },
      }),
    ]);

    await this.notifications.notify({
      type: NotificationType.MODERATION_POST_TAKEDOWN,
      recipientId: post.authorId,
      actorId,
      postId,
      data: { postId, reason: body.reason },
    });

    const reporters = await this.prisma.report.findMany({
      where: { targetPostId: postId },
      select: { reporterId: true },
    });
    for (const reporter of new Set(reporters.map((row) => row.reporterId))) {
      await this.notifications.notify({
        type: NotificationType.MODERATION_POST_TAKEDOWN,
        recipientId: reporter,
        actorId,
        postId,
        data: { postId, reason: body.reason },
      });
    }
  }

  async restorePost(actorId: string, postId: string, body: RestorePostBody): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, takedownAt: true, authorId: true },
    });
    if (!post) throw notFound("Post");
    if (!post.takedownAt) return;

    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: postId },
        data: {
          takedownAt: null,
          takedownReason: null,
          takedownById: null,
        },
        select: { id: true },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: AuditAction.POST_RESTORE,
          targetPostId: postId,
          note: body.note ?? null,
        },
      }),
    ]);

    await this.notifications.notify({
      type: NotificationType.MODERATION_POST_RESTORED,
      recipientId: post.authorId,
      actorId,
      postId,
      data: body.note ? { postId, note: body.note } : { postId },
    });
  }

  // ── Report appeals ───────────────────────────────────────────────────

  async fileAppeal(userId: string, reportId: string, note: string): Promise<AppealAck> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        resolvedAt: true,
        appealStatus: true,
        targetUserId: true,
        targetPostId: true,
        targetCommentId: true,
        targetMessageId: true,
      },
    });
    if (!report) throw notFound("Report");

    // Only the user on the wrong end of the resolved action can appeal —
    // either the reported user, or the author of the reported content.
    // Report stores only IDs for content targets, so look up the author
    // for whichever one is set.
    const ownerIds: (string | null)[] = [report.targetUserId];
    if (report.targetPostId) {
      const p = await this.prisma.post.findUnique({
        where: { id: report.targetPostId },
        select: { authorId: true },
      });
      ownerIds.push(p?.authorId ?? null);
    }
    if (report.targetCommentId) {
      const c = await this.prisma.comment.findUnique({
        where: { id: report.targetCommentId },
        select: { authorId: true },
      });
      ownerIds.push(c?.authorId ?? null);
    }
    if (report.targetMessageId) {
      const m = await this.prisma.message.findUnique({
        where: { id: report.targetMessageId },
        select: { authorId: true },
      });
      ownerIds.push(m?.authorId ?? null);
    }
    if (!ownerIds.filter(Boolean).includes(userId)) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "You can only appeal a report filed against your own content.",
        403,
      );
    }
    if (!report.resolvedAt) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "You can only appeal reports that have been resolved.",
        400,
      );
    }
    if (report.appealStatus) {
      throw new DomainException(
        ErrorCode.APPEAL_ALREADY_FILED,
        "An appeal has already been filed for this report.",
        409,
      );
    }

    const now = new Date();
    const row = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        appealedAt: now,
        appealNote: note,
        appealStatus: "PENDING",
      },
      select: { id: true, appealedAt: true, appealStatus: true },
    });

    return {
      id: row.id,
      appealedAt: row.appealedAt!.toISOString(),
      appealStatus: row.appealStatus!,
    };
  }

  async reviewAppeal(actorId: string, reportId: string, body: ReviewAppealBody): Promise<void> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        appealStatus: true,
        targetUserId: true,
        targetPostId: true,
        targetCommentId: true,
        targetMessageId: true,
      },
    });
    if (!report) throw notFound("Report");
    if (!report.appealStatus) {
      throw new DomainException(
        ErrorCode.APPEAL_NOT_FOUND,
        "No appeal has been filed for this report.",
        404,
      );
    }
    if (report.appealStatus !== "PENDING") {
      throw new DomainException(ErrorCode.CONFLICT, "This appeal has already been reviewed.", 409);
    }

    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.report.update({
        where: { id: reportId },
        data: {
          appealStatus: body.decision,
          appealDecisionNote: body.note ?? null,
          appealReviewedAt: new Date(),
          appealReviewedById: actorId,
        },
        select: { id: true },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId,
          action: AuditAction.REPORT_APPEAL_REVIEW,
          targetReportId: reportId,
          targetUserId: report.targetUserId ?? null,
          targetPostId: report.targetPostId ?? null,
          note: `${body.decision}${body.note ? `: ${body.note}` : ""}`,
        },
      }),
    ];

    // UPHELD = the user was right, reverse whatever was done.
    if (body.decision === "UPHELD") {
      if (report.targetUserId) {
        ops.push(
          this.prisma.user.update({
            where: { id: report.targetUserId },
            data: {
              suspendedAt: null,
              suspendedReason: null,
              suspendedById: null,
            },
            select: { id: true },
          }),
        );
      }
      if (report.targetPostId) {
        ops.push(
          this.prisma.post.update({
            where: { id: report.targetPostId },
            data: {
              takedownAt: null,
              takedownReason: null,
              takedownById: null,
            },
            select: { id: true },
          }),
        );
      }
    }

    await this.prisma.$transaction(ops);

    // Resolve the appellant: the reported user, or the author of the
    // reported post/comment/message. Report stores only IDs for content
    // targets so look up authors separately — same shape as fileAppeal().
    const recipientId = await this.resolveAppealRecipient(report);
    if (recipientId) {
      await this.notifications.notify({
        type: NotificationType.MODERATION_APPEAL_REVIEWED,
        recipientId,
        actorId,
        data: {
          reportId,
          decision: body.decision,
          ...(body.note ? { note: body.note } : {}),
        },
      });
    }
  }

  private async resolveAppealRecipient(report: {
    targetUserId: string | null;
    targetPostId: string | null;
    targetCommentId: string | null;
    targetMessageId: string | null;
  }): Promise<string | null> {
    if (report.targetUserId) return report.targetUserId;
    if (report.targetPostId) {
      const p = await this.prisma.post.findUnique({
        where: { id: report.targetPostId },
        select: { authorId: true },
      });
      return p?.authorId ?? null;
    }
    if (report.targetCommentId) {
      const c = await this.prisma.comment.findUnique({
        where: { id: report.targetCommentId },
        select: { authorId: true },
      });
      return c?.authorId ?? null;
    }
    if (report.targetMessageId) {
      const m = await this.prisma.message.findUnique({
        where: { id: report.targetMessageId },
        select: { authorId: true },
      });
      return m?.authorId ?? null;
    }
    return null;
  }

  // ── Admin post detail ────────────────────────────────────────────────

  // Read-only post fetch that ignores the `takedownAt: null` filter that
  // regular feed/post reads enforce. Moderators need to see the body they
  // took down; soft-deleted rows (`deletedAt != null`) are included too
  // so a deletion-after-takedown workflow still yields an audit-able view.
  async getPostDetail(postId: string): Promise<AdminPostDetail> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: userSummarySelect },
        takedownBy: { select: userSummarySelect },
        media: {
          select: {
            id: true,
            url: true,
            kind: true,
            mimeType: true,
            width: true,
            height: true,
          },
        },
        _count: {
          select: {
            reactions: true,
            comments: true,
            reposts: true,
          },
        },
      },
    });
    if (!post) throw notFound("Post");

    // Report count is not part of Post's relation graph (Report stores
    // `targetPostId` as a loose FK), so fetch it separately.
    const reports = await this.prisma.report.count({
      where: { targetPostId: postId },
    });

    return {
      id: post.id,
      author: actorFromUser(post.author),
      body: post.body,
      language: post.language,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      deletedAt: post.deletedAt?.toISOString() ?? null,
      takedownAt: post.takedownAt?.toISOString() ?? null,
      takedownReason: post.takedownReason,
      takedownBy: post.takedownBy ? actorFromUser(post.takedownBy) : null,
      media: post.media
        .filter((m) => m.kind === "IMAGE" || m.kind === "VIDEO")
        .map((m) => ({
          id: m.id,
          url: m.url,
          kind: m.kind as "IMAGE" | "VIDEO",
          mimeType: m.mimeType,
          width: m.width,
          height: m.height,
        })),
      counts: {
        reactions: post._count.reactions,
        comments: post._count.comments,
        reposts: post._count.reposts,
        reports,
      },
    };
  }

  // ── Admin user detail ────────────────────────────────────────────────

  // Read surface for the moderator console. Includes suspension metadata,
  // profile fields, and a few counts (posts authored, comments authored,
  // reports filed by + against, takedowns recorded). Soft-deleted users
  // are still returned — moderators may need to inspect a closed account.
  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            handle: true,
            firstName: true,
            lastName: true,
            headline: true,
            about: true,
            location: true,
            country: true,
            avatarUrl: true,
          },
        },
        suspendedBy: { select: userSummarySelect },
        _count: {
          select: {
            posts: true,
            comments: true,
            reportsFiled: true,
          },
        },
      },
    });
    if (!user) throw notFound("User");

    // Reports against this user are loose — they can target the user row
    // directly (`targetUserId`) or a post they authored. `targetPostId` is
    // a loose FK on Report (no Prisma relation), so a per-post lookup is
    // the cleanest way to scope by author. Takedowns is the count of this
    // user's posts that have a `takedownAt` set.
    const [reportsAgainstUser, postIds, takedowns] = await Promise.all([
      this.prisma.report.count({ where: { targetUserId: userId } }),
      this.prisma.post.findMany({ where: { authorId: userId }, select: { id: true } }),
      this.prisma.post.count({ where: { authorId: userId, takedownAt: { not: null } } }),
    ]);
    const reportsAgainstPosts =
      postIds.length > 0
        ? await this.prisma.report.count({
            where: { targetPostId: { in: postIds.map((p) => p.id) } },
          })
        : 0;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      locale: user.locale,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      deletedAt: user.deletedAt?.toISOString() ?? null,
      suspendedAt: user.suspendedAt?.toISOString() ?? null,
      suspendedReason: user.suspendedReason,
      suspendedBy: user.suspendedBy ? actorFromUser(user.suspendedBy) : null,
      profile: user.profile
        ? {
            handle: user.profile.handle,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            headline: user.profile.headline,
            about: user.profile.about,
            location: user.profile.location,
            country: user.profile.country,
            avatarUrl: user.profile.avatarUrl,
          }
        : null,
      counts: {
        posts: user._count.posts,
        comments: user._count.comments,
        reportsAgainst: reportsAgainstUser + reportsAgainstPosts,
        reportsFiled: user._count.reportsFiled,
        takedowns,
      },
    };
  }

  // ── Audit log ────────────────────────────────────────────────────────

  async listAudit(query: AuditLogListQuery): Promise<AuditLogPage> {
    const where = auditWhere(query);
    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.after ? { cursor: { id: query.after }, skip: 1 } : {}),
      include: auditIncludes,
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    const data = pageRows.map(toAuditItem);

    const meta: CursorPageMeta = {
      hasMore,
      limit: query.limit,
      nextCursor: hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null,
    };
    return { data, meta };
  }

  async exportAuditCsv(query: AuditLogExportQuery): Promise<string> {
    const rows = await this.prisma.auditLog.findMany({
      where: auditWhere(query),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
      include: auditIncludes,
    });
    return auditToCsv(rows.map(toAuditItem));
  }

  // Audit-log retention. The table is append-only and unbounded — without
  // pruning it grows to gigabytes inside a year of moderation activity.
  // Policy: 1 year by default (override via the `days` argument). The
  // operator triggers this via `POST /admin/audit/prune` on a schedule
  // (Render cron / Vercel cron / external cronjob — we don't ship our own
  // scheduler so the runtime stays single-process). Returns the number of
  // rows deleted so the cron job can log + alert on it.
  async pruneAuditLogs(maxAgeDays = 365): Promise<{ deleted: number; cutoff: string }> {
    const days = Math.max(1, Math.floor(maxAgeDays));
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "AuditLog"
      WHERE "createdAt" < ${cutoff}
      ORDER BY "createdAt" ASC, "id" ASC
      LIMIT 10000
    `;
    if (rows.length === 0) return { deleted: 0, cutoff: cutoff.toISOString() };

    const result = await this.prisma.auditLog.deleteMany({
      where: { id: { in: rows.map((row) => row.id) } },
    });
    return { deleted: result.count, cutoff: cutoff.toISOString() };
  }
}

function notFound(label: string): DomainException {
  return new DomainException(ErrorCode.NOT_FOUND, `${label} not found.`, 404);
}

const userSummarySelect = {
  id: true,
  profile: {
    select: {
      handle: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.UserSelect;

const auditIncludes = {
  actor: { select: userSummarySelect },
} satisfies Prisma.AuditLogInclude;

type AuditRow = {
  id: string;
  action: AuditLogItem["action"];
  actor: {
    id: string;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
  targetUserId: string | null;
  targetPostId: string | null;
  targetReportId: string | null;
  note: string | null;
  createdAt: Date;
};

function toAuditItem(row: AuditRow): AuditLogItem {
  return {
    id: row.id,
    action: row.action,
    actor: actorFromUser(row.actor),
    targetUserId: row.targetUserId,
    targetPostId: row.targetPostId,
    targetReportId: row.targetReportId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function actorFromUser(user: AuditRow["actor"]): AuditActor {
  return {
    userId: user.id,
    handle: user.profile?.handle ?? null,
    firstName: user.profile?.firstName ?? null,
    lastName: user.profile?.lastName ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}

function auditWhere(query: AuditLogListQuery | AuditLogExportQuery): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (query.action) and.push({ action: query.action });
  if (query.targetUserId) and.push({ targetUserId: query.targetUserId });
  if (query.targetPostId) and.push({ targetPostId: query.targetPostId });
  if (query.targetReportId) and.push({ targetReportId: query.targetReportId });
  if (query.actor) {
    const v = query.actor.trim();
    and.push({
      actor: {
        is: {
          OR: [
            { id: v },
            {
              profile: {
                is: {
                  OR: [
                    { handle: { contains: v, mode: "insensitive" } },
                    { firstName: { contains: v, mode: "insensitive" } },
                    { lastName: { contains: v, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        },
      },
    });
  }
  if (query.createdFrom || query.createdTo) {
    and.push({
      createdAt: {
        ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
        ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
      },
    });
  }
  return and.length > 0 ? { AND: and } : {};
}

const csvHeaders = [
  "id",
  "action",
  "actor",
  "targetUserId",
  "targetPostId",
  "targetReportId",
  "note",
  "createdAt",
];

function auditToCsv(rows: AuditLogItem[]): string {
  const body = rows.map((row) =>
    [
      row.id,
      row.action,
      actorCsv(row.actor),
      row.targetUserId ?? "",
      row.targetPostId ?? "",
      row.targetReportId ?? "",
      row.note ?? "",
      row.createdAt,
    ]
      .map(csvCell)
      .join(","),
  );
  return [csvHeaders.join(","), ...body].join("\n");
}

function actorCsv(actor: AuditActor): string {
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ");
  const display = name || actor.handle || actor.userId;
  return `${display} (${actor.userId})`;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
