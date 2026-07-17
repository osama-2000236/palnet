import {
  type BlockedUserDTO,
  type CursorPageMeta,
  ErrorCode,
  type ReportBody,
  takePage,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

interface BlockRow {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Date;
}

interface BlockedListRow {
  id: string;
  blockedId: string;
  createdAt: Date;
  blocked: {
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
}

type BlockSet = { blocking: Set<string>; blockedBy: Set<string> };

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async report(reporterId: string, body: ReportBody): Promise<{ id: string; createdAt: Date }> {
    if (
      !body.targetUserId &&
      !body.targetPostId &&
      !body.targetCommentId &&
      !body.targetMessageId
    ) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "At least one report target is required.",
        400,
      );
    }
    if (body.targetUserId === reporterId) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Cannot report yourself.", 400);
    }

    await this.rejectSelfOwnedTargets(reporterId, body);

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reason: body.reason,
        details: body.details ?? null,
        targetUserId: body.targetUserId ?? null,
        targetPostId: body.targetPostId ?? null,
        targetCommentId: body.targetCommentId ?? null,
        targetMessageId: body.targetMessageId ?? null,
      },
      select: { id: true, createdAt: true },
    });
    return report;
  }

  async block(
    blockerId: string,
    blockedUserId: string,
  ): Promise<{ id: string; blockedUserId: string; createdAt: Date }> {
    if (blockerId === blockedUserId) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Cannot block yourself.", 400);
    }

    const existing = (await this.prisma.blockedUser.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId: blockedUserId } },
    })) as BlockRow | null;
    if (existing) {
      return {
        id: existing.id,
        blockedUserId: existing.blockedId,
        createdAt: existing.createdAt,
      };
    }

    const row = (await this.prisma.blockedUser.create({
      data: { blockerId, blockedId: blockedUserId },
    })) as BlockRow;
    return { id: row.id, blockedUserId: row.blockedId, createdAt: row.createdAt };
  }

  async unblock(blockerId: string, blockedUserId: string): Promise<void> {
    if (blockerId === blockedUserId) {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Cannot unblock yourself.", 400);
    }
    await this.prisma.blockedUser.deleteMany({
      where: { blockerId, blockedId: blockedUserId },
    });
  }

  async listBlocked(
    blockerId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: BlockedUserDTO[]; meta: CursorPageMeta }> {
    const rows = (await this.prisma.blockedUser.findMany({
      where: { blockerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        blocked: {
          select: {
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
    })) as BlockedListRow[];

    const { rows: page, meta } = takePage(rows, limit);
    return { data: page.map((row) => toBlockedUserDto(row)), meta };
  }

  async isBlockedEither(userIdA: string, userIdB: string): Promise<boolean> {
    if (userIdA === userIdB) return false;
    const count = await this.prisma.blockedUser.count({
      where: {
        OR: [
          { blockerId: userIdA, blockedId: userIdB },
          { blockerId: userIdB, blockedId: userIdA },
        ],
      },
    });
    return count > 0;
  }

  async getBlockSet(userId: string): Promise<BlockSet> {
    const rows = (await this.prisma.blockedUser.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
      select: { blockerId: true, blockedId: true },
    })) as Array<{ blockerId: string; blockedId: string }>;

    const blocking = new Set<string>();
    const blockedBy = new Set<string>();
    for (const row of rows) {
      if (row.blockerId === userId) blocking.add(row.blockedId);
      if (row.blockedId === userId) blockedBy.add(row.blockerId);
    }
    return { blocking, blockedBy };
  }

  async getBlockedEitherIds(userId: string): Promise<string[]> {
    const set = await this.getBlockSet(userId);
    return [...new Set([...set.blocking, ...set.blockedBy])];
  }

  private async rejectSelfOwnedTargets(reporterId: string, body: ReportBody): Promise<void> {
    if (body.targetPostId) {
      const post = await this.prisma.post.findUnique({
        where: { id: body.targetPostId },
        select: { authorId: true },
      });
      if (post?.authorId === reporterId) {
        throw new DomainException(ErrorCode.VALIDATION_FAILED, "Cannot report yourself.", 400);
      }
    }
    if (body.targetCommentId) {
      const comment = await this.prisma.comment.findUnique({
        where: { id: body.targetCommentId },
        select: { authorId: true },
      });
      if (comment?.authorId === reporterId) {
        throw new DomainException(ErrorCode.VALIDATION_FAILED, "Cannot report yourself.", 400);
      }
    }
    if (body.targetMessageId) {
      const message = await this.prisma.message.findUnique({
        where: { id: body.targetMessageId },
        select: { authorId: true },
      });
      if (message?.authorId === reporterId) {
        throw new DomainException(ErrorCode.VALIDATION_FAILED, "Cannot report yourself.", 400);
      }
    }
  }
}

function toBlockedUserDto(row: BlockedListRow): BlockedUserDTO {
  const profile = row.blocked.profile;
  return {
    id: row.id,
    blockedUserId: row.blockedId,
    blockedHandle: profile?.handle ?? row.blockedId,
    blockedDisplayName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : "",
    blockedAvatarUrl: profile?.avatarUrl ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
