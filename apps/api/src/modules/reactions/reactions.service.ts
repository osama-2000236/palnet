import { Injectable } from "@nestjs/common";
import { ErrorCode, type ReactionType } from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async set(viewerId: string, postId: string, type: ReactionType): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });
    if (!post) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Post not found.", 404);
    }

    // Upsert — one reaction per (user, post).
    await this.prisma.reaction.upsert({
      where: { userId_postId: { userId: viewerId, postId } },
      create: { userId: viewerId, postId, type },
      update: { type },
    });
  }

  async clear(viewerId: string, postId: string): Promise<void> {
    await this.prisma.reaction.deleteMany({
      where: { userId: viewerId, postId },
    });
  }
}
