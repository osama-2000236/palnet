import { takePage, type CursorPageMeta, type Post as PostDto } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { postInclude, toPostDto, type PostWithIncludes } from "../posts/posts.mapper";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safety: SafetyService,
  ) {}

  async getFeed(
    viewerId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: PostDto[]; meta: CursorPageMeta }> {
    const excludedUserIds = await this.safety.getBlockedEitherIds(viewerId);

    // Single query: posts whose author is viewer OR an ACCEPTED-connected
    // peer (in either direction), excluding blocked-either users and
    // soft-deleted authors. Replaces four round-trips with one indexed scan
    // backed by Post(authorId, deletedAt, createdAt) and Connection(status,…).
    const rows = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        author: {
          deletedAt: null,
          ...(excludedUserIds.length ? { id: { notIn: excludedUserIds } } : {}),
          OR: [
            { id: viewerId },
            {
              sentConnections: {
                some: { receiverId: viewerId, status: "ACCEPTED" },
              },
            },
            {
              recvConnections: {
                some: { requesterId: viewerId, status: "ACCEPTED" },
              },
            },
          ],
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: postInclude(viewerId, excludedUserIds),
    });

    const { rows: page, meta } = takePage(rows, limit);
    return { data: page.map((p) => toPostDto(p as unknown as PostWithIncludes)), meta };
  }
}
