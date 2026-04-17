import { Injectable } from "@nestjs/common";
import {
  type CreatePostBody,
  ErrorCode,
  type Post as PostDto,
  type UpdatePostBody,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";
import { postInclude, toPostDto, type PostWithIncludes } from "./posts.mapper";

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    authorId: string,
    body: CreatePostBody,
  ): Promise<PostDto> {
    const post = await this.prisma.post.create({
      data: {
        authorId,
        body: body.body,
        language: body.language,
        media: body.media.length
          ? {
              create: body.media.map((m) => ({
                url: m.url,
                kind: m.kind,
                mimeType: m.mimeType,
                width: m.width ?? null,
                height: m.height ?? null,
                durationMs: m.durationMs ?? null,
                sizeBytes: m.sizeBytes ?? null,
              })),
            }
          : undefined,
      },
      include: postInclude(authorId),
    });
    return toPostDto(post as unknown as PostWithIncludes);
  }

  async getById(viewerId: string, postId: string): Promise<PostDto> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      include: postInclude(viewerId),
    });
    if (!post) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Post not found.", 404);
    }
    return toPostDto(post as unknown as PostWithIncludes);
  }

  async update(
    viewerId: string,
    postId: string,
    body: UpdatePostBody,
  ): Promise<PostDto> {
    const existing = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });
    if (!existing) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Post not found.", 404);
    }
    if (existing.authorId !== viewerId) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "You cannot edit someone else's post.",
        403,
      );
    }

    const post = await this.prisma.post.update({
      where: { id: postId },
      data: { body: body.body },
      include: postInclude(viewerId),
    });
    return toPostDto(post as unknown as PostWithIncludes);
  }

  async delete(viewerId: string, postId: string): Promise<void> {
    const existing = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });
    if (!existing) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Post not found.", 404);
    }
    if (existing.authorId !== viewerId) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "You cannot delete someone else's post.",
        403,
      );
    }
    // Soft delete — preserve references from comments/reactions for audit.
    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
  }
}
