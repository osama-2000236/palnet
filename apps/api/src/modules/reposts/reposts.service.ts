import { Injectable } from "@nestjs/common";
import { type CreateRepostBody, ErrorCode } from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RepostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    viewerId: string,
    postId: string,
    body: CreateRepostBody,
  ): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true },
    });
    if (!post) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Post not found.", 404);
    }
    await this.prisma.repost.upsert({
      where: { userId_postId: { userId: viewerId, postId } },
      create: { userId: viewerId, postId, comment: body.comment ?? null },
      update: { comment: body.comment ?? null },
    });
  }

  async delete(viewerId: string, postId: string): Promise<void> {
    await this.prisma.repost.deleteMany({
      where: { userId: viewerId, postId },
    });
  }
}
