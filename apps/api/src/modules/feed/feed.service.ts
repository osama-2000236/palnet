import type { Prisma } from "@baydar/db";
import { takePage, type CursorPageMeta, type Post as PostDto } from "@baydar/shared";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";
import {
  attachReactionBreakdown,
  postInclude,
  toPostDto,
  type PostWithIncludes,
} from "../posts/posts.mapper";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import {
  AFFINITY,
  dedupe,
  DISCOVER_CANDIDATES,
  diversify,
  HORIZON_MS,
  NETWORK_CANDIDATES,
  normaliseCity,
  REPOST_CANDIDATES,
  score,
  SLATE_TTL_MS,
  type Candidate,
  type SlateReasons,
} from "./feed.ranking";

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: SafetyService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async getFeed(
    viewerId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: PostDto[]; meta: CursorPageMeta }> {
    const excludedUserIds = await this.safety.getBlockedEitherIds(viewerId);
    const networkIds = await this.networkIds(viewerId, excludedUserIds);

    if (this.config.get("FEED_RANKING_ENABLED", { infer: true }) === "false") {
      return this.chronological(viewerId, networkIds, excludedUserIds, cursor, limit);
    }

    const slate = cursor
      ? await this.prisma.feedSlate.findFirst({
          where: { userId: viewerId, postIds: { has: cursor } },
          orderBy: { generatedAt: "desc" },
          select: { postIds: true, reasons: true },
        })
      : await this.buildSlate(viewerId, networkIds, excludedUserIds);
    // A cursor from a slate that has since been swept: the page ends here and
    // the client's pull-to-refresh builds a fresh one.
    if (!slate) return { data: [], meta: { nextCursor: null, hasMore: false, limit } };

    const start = cursor ? slate.postIds.indexOf(cursor) + 1 : 0;
    const ids = slate.postIds.slice(start, start + limit);
    const hasMore = start + limit < slate.postIds.length;
    const rows = await this.prisma.post.findMany({
      // Re-checked on read: a post deleted, or an author blocked, after the
      // slate was frozen must not come back on page three.
      where: {
        id: { in: ids },
        deletedAt: null,
        author: {
          deletedAt: null,
          ...(excludedUserIds.length ? { id: { notIn: excludedUserIds } } : {}),
        },
      },
      include: postInclude(viewerId, excludedUserIds),
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids.flatMap((id) => byId.get(id) ?? []);
    const enriched = await attachReactionBreakdown(this.prisma, ordered, excludedUserIds);
    const reasons = (slate.reasons ?? {}) as SlateReasons;
    return {
      data: enriched.map((p) => {
        const dto = toPostDto(p as unknown as PostWithIncludes);
        const reason = reasons[p.id];
        return reason ? { ...dto, feedReason: reason } : dto;
      }),
      meta: { nextCursor: hasMore ? (ids.at(-1) ?? null) : null, hasMore, limit },
    };
  }

  // Resolved once, up front: an `authorId IN (...)` scan rides
  // Post(authorId, deletedAt, createdAt), where the old author relation filter
  // ran two correlated EXISTS subqueries against Connection for every post.
  private async networkIds(viewerId: string, excludedUserIds: string[]): Promise<string[]> {
    const rows = await this.prisma.connection.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: viewerId }, { receiverId: viewerId }] },
      select: { requesterId: true, receiverId: true },
    });
    const excluded = new Set(excludedUserIds);
    return rows
      .map((r) => (r.requesterId === viewerId ? r.receiverId : r.requesterId))
      .filter((id) => !excluded.has(id));
  }

  private async chronological(
    viewerId: string,
    networkIds: string[],
    excludedUserIds: string[],
    cursor: string | null,
    limit: number,
  ): Promise<{ data: PostDto[]; meta: CursorPageMeta }> {
    const rows = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        authorId: { in: [viewerId, ...networkIds] },
        author: { deletedAt: null },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: postInclude(viewerId, excludedUserIds),
    });
    const { rows: page, meta } = takePage(rows, limit);
    // One grouped query for the whole page, not one per post.
    const enriched = await attachReactionBreakdown(this.prisma, page, excludedUserIds);
    return { data: enriched.map((p) => toPostDto(p as unknown as PostWithIncludes)), meta };
  }

  private async buildSlate(
    viewerId: string,
    networkIds: string[],
    excludedUserIds: string[],
  ): Promise<{ postIds: string[]; reasons: SlateReasons } | null> {
    const now = Date.now();
    const horizon = new Date(now - HORIZON_MS);
    const engagement = {
      _count: {
        select: { reactions: true, comments: { where: { deletedAt: null } }, reposts: true },
      },
    } satisfies Prisma.PostSelect;
    const liveAuthor = { deletedAt: null } as const;
    const ownCircle = [viewerId, ...networkIds];

    const [network, reposts, outside, viewerProfile] = await Promise.all([
      // ponytail: no horizon here, the take bounds it — a quiet network still
      // fills the feed. Posts past the newest 300 are only reachable through
      // the profile pages; page the candidate set if networks outgrow that.
      this.prisma.post.findMany({
        where: { deletedAt: null, authorId: { in: ownCircle }, author: liveAuthor },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: NETWORK_CANDIDATES,
        select: { id: true, authorId: true, createdAt: true, ...engagement },
      }),
      networkIds.length
        ? this.prisma.repost.findMany({
            where: {
              userId: { in: networkIds },
              createdAt: { gte: horizon },
              post: {
                deletedAt: null,
                author: {
                  ...liveAuthor,
                  ...(excludedUserIds.length ? { id: { notIn: excludedUserIds } } : {}),
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: REPOST_CANDIDATES,
            select: {
              createdAt: true,
              user: {
                select: { profile: { select: { handle: true, firstName: true, lastName: true } } },
              },
              post: { select: { id: true, authorId: true, ...engagement } },
            },
          })
        : Promise.resolve([]),
      this.prisma.post.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: horizon },
          authorId: { notIn: [...ownCircle, ...excludedUserIds] },
          author: liveAuthor,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: DISCOVER_CANDIDATES,
        select: {
          id: true,
          authorId: true,
          createdAt: true,
          author: { select: { profile: { select: { location: true } } } },
          ...engagement,
        },
      }),
      this.prisma.profile.findUnique({ where: { userId: viewerId }, select: { location: true } }),
    ]);

    const viewerCity = normaliseCity(viewerProfile?.location);
    const candidates: Candidate[] = [
      ...network.map((p) => ({
        postId: p.id,
        authorId: p.authorId,
        score: score(AFFINITY.network, p.createdAt, now, p),
        outOfNetwork: false,
        reason: null,
      })),
      ...reposts.flatMap((r) =>
        r.user.profile
          ? [
              {
                postId: r.post.id,
                authorId: r.post.authorId,
                // A repost is fresh distribution: it decays from the repost.
                score: score(AFFINITY.repost, r.createdAt, now, r.post),
                outOfNetwork: false,
                reason: { kind: "REPOST" as const, actor: r.user.profile },
              },
            ]
          : [],
      ),
      ...outside.map((p) => {
        const nearby =
          viewerCity !== null && normaliseCity(p.author.profile?.location) === viewerCity;
        return {
          postId: p.id,
          authorId: p.authorId,
          score: score(nearby ? AFFINITY.nearby : AFFINITY.discover, p.createdAt, now, p),
          outOfNetwork: true,
          reason: { kind: nearby ? ("NEARBY" as const) : ("DISCOVER" as const), actor: null },
        };
      }),
    ];

    const ranked = diversify(dedupe(candidates));
    if (ranked.length === 0) return null;

    const postIds = ranked.map((c) => c.postId);
    const reasons: SlateReasons = {};
    for (const c of ranked) if (c.reason) reasons[c.postId] = c.reason;

    // Sweep this viewer's lapsed slates on the way in. A slate stays readable
    // for paging until it is swept, so a tab left open past the TTL keeps
    // working until the next refresh replaces it.
    // ponytail: someone who never opens the feed again keeps their last
    // slate row; add a global expiresAt sweep to the retention cron if the
    // table ever matters.
    await this.prisma.$transaction([
      this.prisma.feedSlate.deleteMany({
        where: { userId: viewerId, expiresAt: { lt: new Date(now) } },
      }),
      this.prisma.feedSlate.create({
        data: {
          userId: viewerId,
          postIds,
          reasons: reasons as Prisma.InputJsonObject,
          expiresAt: new Date(now + SLATE_TTL_MS),
        },
      }),
    ]);
    return { postIds, reasons };
  }
}
