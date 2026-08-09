import {
  ErrorCode,
  followTargetKey,
  takePage,
  type CursorPageMeta,
  type FollowBody,
  type FollowRow,
  type FollowState,
  type FollowTargetType,
  type FollowerCounts,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Following, and the counters that make it readable.
 *
 * A follow is asymmetric and costs the person followed nothing, which is the
 * whole reason it exists: 8.82 million Palestinians abroad mostly do not know
 * each other, and a mutual-only graph caps them at their address book.
 */
@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Follow, idempotently.
   *
   * The write and the counter move in one transaction, and the counter moves
   * with `increment` rather than a read-then-write — two concurrent follows
   * read the same number and one of them is lost otherwise, permanently, in a
   * column nothing recomputes until the nightly job.
   */
  async follow(followerId: string, body: FollowBody): Promise<FollowState> {
    if (body.targetType === "USER") {
      if (body.targetUserId === followerId) {
        throw new DomainException(ErrorCode.CONNECTION_SELF, "You cannot follow yourself.", 400);
      }
      await this.assertNotBlocked(followerId, body.targetUserId!);
    }

    const targetKey = followTargetKey(body);

    await this.prisma.$transaction(async (tx) => {
      // The unique index is the arbiter, not a prior SELECT: checking first and
      // inserting second is a race that double-counts.
      const created = await tx.follow.createMany({
        data: [
          {
            followerId,
            targetType: body.targetType,
            targetUserId: body.targetUserId ?? null,
            targetCompanyId: body.targetCompanyId ?? null,
            targetTopicKey: body.targetTopicKey ?? null,
            targetKey,
          },
        ],
        skipDuplicates: true,
      });
      if (created.count === 0) return;

      await tx.followerCount.upsert({
        where: { targetKey },
        create: { targetKey, targetType: body.targetType, count: 1 },
        update: { count: { increment: 1 } },
      });
    });

    return this.stateFor(followerId, body);
  }

  /** Unfollow, idempotently. Unfollowing never disconnects. */
  async unfollow(followerId: string, body: FollowBody): Promise<FollowState> {
    const targetKey = followTargetKey(body);

    await this.prisma.$transaction(async (tx) => {
      const removed = await tx.follow.deleteMany({ where: { followerId, targetKey } });
      if (removed.count === 0) return;

      // `decrement` guarded by the row's own value: the table has a
      // CHECK (count >= 0), and a counter that throws on unfollow would make
      // drift a user-facing error rather than a job's problem.
      await tx.followerCount.updateMany({
        where: { targetKey, count: { gt: 0 } },
        data: { count: { decrement: 1 } },
      });
    });

    return this.stateFor(followerId, body);
  }

  /** How the viewer relates to this target, both directions. */
  async stateFor(viewerId: string, body: FollowBody): Promise<FollowState> {
    const targetKey = followTargetKey(body);
    const [following, followsYou] = await Promise.all([
      this.prisma.follow.count({ where: { followerId: viewerId, targetKey } }),
      body.targetType === "USER" && body.targetUserId
        ? this.prisma.follow.count({
            where: { followerId: body.targetUserId, targetKey: `USER:${viewerId}` },
          })
        : Promise.resolve(0),
    ]);
    return { following: following > 0, followsYou: followsYou > 0 };
  }

  /** Follower and following totals for one member. */
  async countsFor(userId: string): Promise<FollowerCounts> {
    const [followers, following] = await Promise.all([
      this.prisma.followerCount.findUnique({ where: { targetKey: `USER:${userId}` } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { followers: followers?.count ?? 0, following };
  }

  /** Who the viewer follows, newest first. */
  async listFollowing(
    followerId: string,
    targetType: FollowTargetType | null,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: FollowRow[]; meta: CursorPageMeta }> {
    const rows = await this.prisma.follow.findMany({
      where: { followerId, ...(targetType ? { targetType } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: FOLLOW_SELECT,
    });
    const { rows: page, meta } = takePage(rows, limit);
    return { data: page.map(toFollowRow), meta };
  }

  /** Who follows this member, newest first. */
  async listFollowers(
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: FollowRow[]; meta: CursorPageMeta }> {
    const rows = await this.prisma.follow.findMany({
      where: { targetKey: `USER:${userId}` },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: FOLLOWER_SELECT,
    });
    const { rows: page, meta } = takePage(rows, limit);
    return { data: page.map(toFollowerRow), meta };
  }

  /**
   * Blocking is mutual invisibility, so it stops a follow in both directions.
   * Checked here rather than trusted from the client, which cannot know about
   * a block placed on it.
   */
  private async assertNotBlocked(a: string, b: string): Promise<void> {
    const blocked = await this.prisma.blockedUser.count({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    if (blocked > 0) {
      throw new DomainException(ErrorCode.BLOCKED, "That member is not available.", 403);
    }
  }
}

const PERSON = {
  id: true,
  profile: {
    select: { handle: true, firstName: true, lastName: true, headline: true, avatarUrl: true },
  },
} as const;

const FOLLOW_SELECT = {
  id: true,
  targetType: true,
  createdAt: true,
  targetTopicKey: true,
  targetUser: { select: PERSON },
  targetCompany: { select: { id: true, slug: true, name: true, logoUrl: true } },
} as const;

const FOLLOWER_SELECT = {
  id: true,
  targetType: true,
  createdAt: true,
  targetTopicKey: true,
  follower: { select: PERSON },
} as const;

type PersonRow = {
  id: string;
  profile: {
    handle: string;
    firstName: string;
    lastName: string;
    headline: string | null;
    avatarUrl: string | null;
  } | null;
};

/** A person row, or null when the profile is missing — never a half-person. */
function toPerson(row: PersonRow | null): FollowRow["user"] {
  if (!row?.profile) return null;
  return { userId: row.id, ...row.profile };
}

function toFollowRow(row: {
  id: string;
  targetType: FollowTargetType;
  createdAt: Date;
  targetTopicKey: string | null;
  targetUser: PersonRow | null;
  targetCompany: { id: string; slug: string; name: string; logoUrl: string | null } | null;
}): FollowRow {
  return {
    id: row.id,
    targetType: row.targetType,
    createdAt: row.createdAt.toISOString(),
    user: toPerson(row.targetUser),
    company: row.targetCompany,
    topicKey: row.targetTopicKey,
  };
}

function toFollowerRow(row: {
  id: string;
  targetType: FollowTargetType;
  createdAt: Date;
  targetTopicKey: string | null;
  follower: PersonRow;
}): FollowRow {
  return {
    id: row.id,
    targetType: row.targetType,
    createdAt: row.createdAt.toISOString(),
    user: toPerson(row.follower),
    company: null,
    topicKey: null,
  };
}
