import type { CursorPageMeta, Post as PostDto } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { postInclude, toPostDto, type PostWithIncludes } from "../posts/posts.mapper";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(
    viewerId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: PostDto[]; meta: CursorPageMeta }> {
    // Authors whose posts we want: self + ACCEPTED connections in either direction.
    const connections = await this.prisma.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: viewerId }, { receiverId: viewerId }],
      },
      select: { requesterId: true, receiverId: true },
    });
    const authorIds = new Set<string>([viewerId]);
    for (const c of connections) {
      authorIds.add(c.requesterId === viewerId ? c.receiverId : c.requesterId);
    }

    // Fetch limit + 1 for hasMore detection.
    const rows = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        authorId: { in: [...authorIds] },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: postInclude(viewerId),
    });

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;

    return {
      data: trimmed.map((p) => toPostDto(p as unknown as PostWithIncludes)),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit,
      },
    };
  }
}
