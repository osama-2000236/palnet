import { Injectable } from "@nestjs/common";
import { ErrorCode, NotificationType, type ReactionType } from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async set(viewerId: string, postId: string, type: ReactionType): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
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

    // Fire-and-forget notification to the post author, dedup'd so rapid
    // toggle doesn't spam. Skipped automatically when viewer === author.
    void this.notifications.notify({
      type: NotificationType.POST_REACTION,
      recipientId: post.authorId,
      actorId: viewerId,
      postId,
      data: { reactionType: type },
      dedupe: true,
    });
  }

  async clear(viewerId: string, postId: string): Promise<void> {
    await this.prisma.reaction.deleteMany({
      where: { userId: viewerId, postId },
    });
  }
}
