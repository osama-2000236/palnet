import { Injectable } from "@nestjs/common";
import { Prisma } from "@palnet/db";
import {
  type AdminReportActor,
  type AdminReportExportQuery,
  type AdminReportItem,
  type AdminReportListQuery,
  type AdminReportTargetPreview,
  type BlockedUserItem,
  type CreateReportBody,
  type CursorPageMeta,
  ErrorCode,
  type MyReportItem,
  type MyReportsListQuery,
  type MyReportsPage,
  type ReportAck,
  type ReportTargetKind,
  type ResolveReportBody,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

// Moderation — user-initiated safety actions.
//
// Reports are fire-and-forget from the viewer's perspective. We persist a
// row and return an ack; an admin triage console (Sprint 11+) will later
// surface these. We do NOT attempt automatic action on the target — day-
// one policy is "a human decides".
//
// Blocks are the actionable primitive. The wire call is one-directional
// (viewer blocks target) but enforcement is symmetric: query helpers here
// return both "users I've blocked" and "users who've blocked me", so the
// caller can exclude either side. That's what `blockedIds` exposes.
@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Reports ──────────────────────────────────────────────────────────

  async createReport(reporterId: string, body: CreateReportBody): Promise<ReportAck> {
    // Verify the target exists so we don't accumulate orphan rows. Also
    // prevents a reporter from spamming the moderation queue with made-up
    // IDs.
    await this.assertTargetExists(body.targetKind, body.targetId);

    // Reporting yourself is meaningless and usually a misclick. Block it.
    if (body.targetKind === "USER" && body.targetId === reporterId) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "You can't report yourself.", 400);
    }

    const row = await this.prisma.report.create({
      data: {
        reporterId,
        reason: body.reason,
        details: body.details ?? null,
        targetUserId: body.targetKind === "USER" ? body.targetId : null,
        targetPostId: body.targetKind === "POST" ? body.targetId : null,
        targetCommentId: body.targetKind === "COMMENT" ? body.targetId : null,
        targetMessageId: body.targetKind === "MESSAGE" ? body.targetId : null,
      },
      select: { id: true, createdAt: true },
    });

    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async assertTargetExists(kind: ReportTargetKind, id: string): Promise<void> {
    switch (kind) {
      case "USER": {
        const hit = await this.prisma.user.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!hit) throw notFound();
        return;
      }
      case "POST": {
        const hit = await this.prisma.post.findFirst({
          where: { id, deletedAt: null },
          select: { id: true },
        });
        if (!hit) throw notFound();
        return;
      }
      case "COMMENT": {
        const hit = await this.prisma.comment.findFirst({
          where: { id, deletedAt: null },
          select: { id: true },
        });
        if (!hit) throw notFound();
        return;
      }
      case "MESSAGE": {
        const hit = await this.prisma.message.findFirst({
          where: { id, deletedAt: null },
          select: { id: true },
        });
        if (!hit) throw notFound();
        return;
      }
    }
  }

  // ── Blocks ───────────────────────────────────────────────────────────

  async block(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "You can't block yourself.", 400);
    }

    const target = await this.prisma.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });
    if (!target) throw notFound();

    // Idempotent: blocking an already-blocked user is a no-op. We also
    // tear down any pending/accepted connection in either direction so
    // the blocked party doesn't show up in the viewer's network stays.
    await this.prisma.$transaction([
      this.prisma.blockedUser.upsert({
        where: {
          blockerId_blockedId: { blockerId, blockedId },
        },
        create: { blockerId, blockedId },
        update: {},
      }),
      this.prisma.connection.deleteMany({
        where: {
          OR: [
            { requesterId: blockerId, receiverId: blockedId },
            { requesterId: blockedId, receiverId: blockerId },
          ],
        },
      }),
    ]);
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.blockedUser.deleteMany({
      where: { blockerId, blockedId },
    });
  }

  async listBlocks(blockerId: string): Promise<BlockedUserItem[]> {
    const rows = await this.prisma.blockedUser.findMany({
      where: { blockerId },
      orderBy: { createdAt: "desc" },
      include: {
        blocked: {
          select: {
            id: true,
            profile: {
              select: {
                handle: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return rows
      .filter((r) => r.blocked.profile !== null)
      .map((r) => ({
        userId: r.blocked.id,
        handle: r.blocked.profile!.handle,
        firstName: r.blocked.profile!.firstName,
        lastName: r.blocked.profile!.lastName,
        avatarUrl: r.blocked.profile!.avatarUrl ?? null,
        createdAt: r.createdAt.toISOString(),
      }));
  }

  // ── Query helpers (used by feed/search/messaging) ────────────────────

  // Returns the union of IDs on either side of a block with the viewer —
  // anyone the viewer has blocked OR anyone who has blocked the viewer.
  // This is the set feed/search/messaging exclude to enforce symmetry.
  async blockedIds(viewerId: string): Promise<string[]> {
    const rows = await this.prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const ids = new Set<string>();
    for (const r of rows) {
      ids.add(r.blockerId === viewerId ? r.blockedId : r.blockerId);
    }
    return [...ids];
  }

  // ── Admin triage ─────────────────────────────────────────────────────

  async listReports(
    query: AdminReportListQuery,
  ): Promise<{ data: AdminReportItem[]; meta: CursorPageMeta }> {
    const rows = await this.prisma.report.findMany({
      where: reportWhere(query),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.after ? { cursor: { id: query.after }, skip: 1 } : {}),
      include: reportIncludes,
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    const data = await Promise.all(pageRows.map((row) => this.toAdminItem(row)));

    return {
      data,
      meta: {
        hasMore,
        limit: query.limit,
        nextCursor: hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null,
      },
    };
  }

  async getReport(id: string): Promise<AdminReportItem> {
    const row = await this.prisma.report.findUnique({
      where: { id },
      include: reportIncludes,
    });
    if (!row) throw notFound();
    return this.toAdminItem(row);
  }

  async resolveReport(
    id: string,
    resolverId: string,
    body: ResolveReportBody,
  ): Promise<AdminReportItem> {
    const current = await this.prisma.report.findUnique({
      where: { id },
      select: { id: true, resolvedAt: true },
    });
    if (!current) throw notFound();
    if (current.resolvedAt) return this.getReport(id);

    await this.prisma.report.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedById: resolverId,
        resolvedNote: body.note ?? null,
      },
      select: { id: true },
    });

    return this.getReport(id);
  }

  async exportReportsCsv(query: AdminReportExportQuery): Promise<string> {
    const rows = await this.prisma.report.findMany({
      where: reportWhere(query),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
      include: reportIncludes,
    });
    const data = await Promise.all(rows.map((row) => this.toAdminItem(row)));

    return reportsToCsv(data);
  }

  // ── User-facing: reports against the viewer's own content ────────────

  // Lists reports where the viewer is the target (user reports) or owns the
  // targeted content (post/comment/message). Only *resolved* reports are
  // surfaced: unresolved reports are still in triage and revealing them
  // would tip off the target before moderators act. Reporter/resolver
  // identity is stripped — `MyReportItem` drops those fields entirely.
  async listMyReports(viewerId: string, query: MyReportsListQuery): Promise<MyReportsPage> {
    const [postIds, commentIds, messageIds] = await Promise.all([
      this.prisma.post.findMany({
        where: { authorId: viewerId },
        select: { id: true },
      }),
      this.prisma.comment.findMany({
        where: { authorId: viewerId },
        select: { id: true },
      }),
      this.prisma.message.findMany({
        where: { authorId: viewerId },
        select: { id: true },
      }),
    ]);

    const ownershipOr: Prisma.ReportWhereInput[] = [{ targetUserId: viewerId }];
    if (postIds.length > 0) {
      ownershipOr.push({ targetPostId: { in: postIds.map((p) => p.id) } });
    }
    if (commentIds.length > 0) {
      ownershipOr.push({ targetCommentId: { in: commentIds.map((c) => c.id) } });
    }
    if (messageIds.length > 0) {
      ownershipOr.push({ targetMessageId: { in: messageIds.map((m) => m.id) } });
    }

    const rows = await this.prisma.report.findMany({
      where: {
        AND: [{ OR: ownershipOr }, { resolvedAt: { not: null } }],
      },
      orderBy: [{ resolvedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.after ? { cursor: { id: query.after }, skip: 1 } : {}),
      include: reportIncludes,
    });

    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    const admin = await Promise.all(pageRows.map((row) => this.toAdminItem(row)));
    const data: MyReportItem[] = admin.map((row) => ({
      id: row.id,
      reason: row.reason,
      targetKind: row.targetKind,
      targetId: row.targetId,
      target: row.target,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
      resolvedNote: row.resolvedNote,
      appealedAt: row.appealedAt,
      appealNote: row.appealNote,
      appealStatus: row.appealStatus,
      appealDecisionNote: row.appealDecisionNote,
      appealReviewedAt: row.appealReviewedAt,
    }));

    return {
      data,
      meta: {
        hasMore,
        limit: query.limit,
        nextCursor: hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null,
      },
    };
  }

  private async toAdminItem(row: ReportRow): Promise<AdminReportItem> {
    const target = targetFromReport(row);
    const preview = await this.targetPreview(target);

    return {
      id: row.id,
      reporter: actorFromUser(row.reporter),
      reason: row.reason,
      details: row.details ?? null,
      targetKind: target.kind,
      targetId: target.id,
      target: preview,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      resolvedNote: row.resolvedNote ?? null,
      resolvedBy: row.resolvedBy ? actorFromUser(row.resolvedBy) : null,
      appealedAt: row.appealedAt?.toISOString() ?? null,
      appealNote: row.appealNote ?? null,
      appealStatus: row.appealStatus ?? null,
      appealDecisionNote: row.appealDecisionNote ?? null,
      appealReviewedAt: row.appealReviewedAt?.toISOString() ?? null,
      appealReviewedBy: row.appealReviewedBy ? actorFromUser(row.appealReviewedBy) : null,
    };
  }

  private async targetPreview(target: TargetRef): Promise<AdminReportTargetPreview> {
    switch (target.kind) {
      case "USER": {
        const user = await this.prisma.user.findUnique({
          where: { id: target.id },
          select: userSummarySelect,
        });
        if (!user) return unavailable(target);
        const actor = actorFromUser(user);
        return {
          state: "available",
          kind: target.kind,
          id: target.id,
          label: displayName(actor),
          excerpt: null,
          author: actor,
        };
      }
      case "POST": {
        const post = await this.prisma.post.findFirst({
          where: { id: target.id, deletedAt: null },
          select: {
            id: true,
            body: true,
            author: { select: userSummarySelect },
          },
        });
        if (!post) return unavailable(target);
        const author = actorFromUser(post.author);
        return {
          state: "available",
          kind: target.kind,
          id: target.id,
          label: "Post",
          excerpt: excerpt(post.body),
          author,
        };
      }
      case "COMMENT": {
        const comment = await this.prisma.comment.findFirst({
          where: { id: target.id, deletedAt: null },
          select: {
            id: true,
            body: true,
            author: { select: userSummarySelect },
          },
        });
        if (!comment) return unavailable(target);
        const author = actorFromUser(comment.author);
        return {
          state: "available",
          kind: target.kind,
          id: target.id,
          label: "Comment",
          excerpt: excerpt(comment.body),
          author,
        };
      }
      case "MESSAGE": {
        const message = await this.prisma.message.findFirst({
          where: { id: target.id, deletedAt: null },
          select: {
            id: true,
            body: true,
            author: { select: userSummarySelect },
          },
        });
        if (!message) return unavailable(target);
        const author = actorFromUser(message.author);
        return {
          state: "available",
          kind: target.kind,
          id: target.id,
          label: "Message",
          excerpt: excerpt(message.body),
          author,
        };
      }
    }
  }
}

function notFound(): DomainException {
  return new DomainException(ErrorCode.NOT_FOUND, "Target not found.", 404);
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

const reportIncludes = {
  reporter: { select: userSummarySelect },
  resolvedBy: { select: userSummarySelect },
  appealReviewedBy: { select: userSummarySelect },
} satisfies Prisma.ReportInclude;

type UserSummary = {
  id: string;
  profile: {
    handle: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
};

type ReportRow = {
  id: string;
  reporter: UserSummary;
  reason: AdminReportItem["reason"];
  details: string | null;
  targetUserId: string | null;
  targetPostId: string | null;
  targetCommentId: string | null;
  targetMessageId: string | null;
  resolvedAt: Date | null;
  resolvedNote: string | null;
  resolvedBy: UserSummary | null;
  appealedAt: Date | null;
  appealNote: string | null;
  appealStatus: AdminReportItem["appealStatus"];
  appealDecisionNote: string | null;
  appealReviewedAt: Date | null;
  appealReviewedBy: UserSummary | null;
  createdAt: Date;
};

type TargetRef = { kind: ReportTargetKind; id: string };

function reportWhere(query: AdminReportListQuery): Prisma.ReportWhereInput {
  const and: Prisma.ReportWhereInput[] = [];

  if (query.status === "open") and.push({ resolvedAt: null });
  if (query.status === "resolved") and.push({ resolvedAt: { not: null } });
  if (query.reason) and.push({ reason: query.reason });
  if (query.targetKind) and.push(targetKindWhere(query.targetKind));
  if (query.reporter) and.push({ reporter: { is: userAuditWhere(query.reporter) } });
  if (query.resolver) {
    and.push({ resolvedBy: { is: userAuditWhere(query.resolver) } });
  }
  if (query.createdFrom || query.createdTo) {
    and.push({
      createdAt: dateRangeWhere(query.createdFrom, query.createdTo),
    });
  }
  if (query.resolvedFrom || query.resolvedTo) {
    and.push({
      resolvedAt: dateRangeWhere(query.resolvedFrom, query.resolvedTo),
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

function userAuditWhere(value: string): Prisma.UserWhereInput {
  const query = value.trim();
  return {
    OR: [
      { id: query },
      {
        profile: {
          is: {
            OR: [
              { handle: { contains: query, mode: "insensitive" } },
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
            ],
          },
        },
      },
    ],
  };
}

function dateRangeWhere(from: string | undefined, to: string | undefined): Prisma.DateTimeFilter {
  return {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {}),
  };
}

function targetKindWhere(kind: ReportTargetKind): Prisma.ReportWhereInput {
  switch (kind) {
    case "USER":
      return { targetUserId: { not: null } };
    case "POST":
      return { targetPostId: { not: null } };
    case "COMMENT":
      return { targetCommentId: { not: null } };
    case "MESSAGE":
      return { targetMessageId: { not: null } };
  }
}

function targetFromReport(row: ReportRow): TargetRef {
  if (row.targetUserId) return { kind: "USER", id: row.targetUserId };
  if (row.targetPostId) return { kind: "POST", id: row.targetPostId };
  if (row.targetCommentId) return { kind: "COMMENT", id: row.targetCommentId };
  if (row.targetMessageId) return { kind: "MESSAGE", id: row.targetMessageId };
  throw new DomainException(ErrorCode.VALIDATION_FAILED, "Report has no target.", 500);
}

function actorFromUser(user: UserSummary): AdminReportActor {
  return {
    userId: user.id,
    handle: user.profile?.handle ?? null,
    firstName: user.profile?.firstName ?? null,
    lastName: user.profile?.lastName ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
  };
}

function displayName(actor: AdminReportActor): string {
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ");
  return name || actor.handle || actor.userId;
}

function excerpt(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function unavailable(target: TargetRef): AdminReportTargetPreview {
  return {
    state: "unavailable",
    kind: target.kind,
    id: target.id,
    label: "unavailable",
    excerpt: null,
    author: null,
  };
}

const csvHeaders = [
  "id",
  "status",
  "reason",
  "targetKind",
  "targetId",
  "targetPreview",
  "reporter",
  "resolver",
  "createdAt",
  "resolvedAt",
  "details",
];

function reportsToCsv(rows: AdminReportItem[]): string {
  const body = rows.map((row) =>
    [
      row.id,
      row.resolvedAt ? "resolved" : "open",
      row.reason,
      row.targetKind,
      row.targetId,
      targetCsv(row.target),
      actorCsv(row.reporter),
      actorCsv(row.resolvedBy),
      row.createdAt,
      row.resolvedAt ?? "",
      row.details ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  return [csvHeaders.join(","), ...body].join("\n");
}

function targetCsv(target: AdminReportTargetPreview): string {
  if (target.state === "unavailable") {
    return `unavailable ${target.kind} ${target.id}`;
  }
  const author = target.author ? ` by ${displayName(target.author)}` : "";
  const excerptText = target.excerpt ? `: ${target.excerpt}` : "";
  return `${target.label}${author}${excerptText}`;
}

function actorCsv(actor: AdminReportActor | null): string {
  if (!actor) return "";
  return `${displayName(actor)} (${actor.userId})`;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
