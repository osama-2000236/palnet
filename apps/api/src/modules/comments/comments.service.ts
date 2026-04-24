import { Injectable } from "@nestjs/common";
import {
  type Comment as CommentDto,
  type CreateCommentBody,
  type CursorPageMeta,
  ErrorCode,
  NotificationType,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

interface CommentWithAuthor {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
}

function toCommentDto(row: CommentWithAuthor): CommentDto {
  if (!row.author.profile) {
    throw new Error(`Comment ${row.id} has an author without a profile; data invariant bug.`);
  }
  return {
    id: row.id,
    postId: row.postId,
    parentId: row.parentId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: {
      id: row.author.id,
      handle: row.author.profile.handle,
      firstName: row.author.profile.firstName,
      lastName: row.author.profile.lastName,
      avatarUrl: row.author.profile.avatarUrl,
    },
  };
}

const COMMENT_INCLUDE = {
  author: {
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
} as const;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(viewerId: string, postId: string, body: CreateCommentBody): Promise<CommentDto> {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Post not found.", 404);
    }

    let parentAuthorId: string | null = null;
    if (body.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: body.parentId, postId, deletedAt: null },
        select: { id: true, authorId: true },
      });
      if (!parent) {
        throw new DomainException(ErrorCode.NOT_FOUND, "Parent comment not found.", 404);
      }
      parentAuthorId = parent.authorId;
    }

    const row = await this.prisma.comment.create({
      data: {
        postId,
        authorId: viewerId,
        body: body.body,
        parentId: body.parentId ?? null,
      },
      include: COMMENT_INCLUDE,
    });
    const dto = toCommentDto(row as unknown as CommentWithAuthor);

    // Notify the post author about the new comment.
    void this.notifications.notify({
      type: NotificationType.POST_COMMENT,
      recipientId: post.authorId,
      actorId: viewerId,
      postId,
      commentId: dto.id,
    });
    // Also notify the parent-comment author on a reply (if different from post author).
    if (parentAuthorId && parentAuthorId !== post.authorId) {
      void this.notifications.notify({
        type: NotificationType.POST_COMMENT,
        recipientId: parentAuthorId,
        actorId: viewerId,
        postId,
        commentId: dto.id,
      });
    }
    return dto;
  }

  async list(
    postId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: CommentDto[]; meta: CursorPageMeta }> {
    const rows = await this.prisma.comment.findMany({
      where: { postId, deletedAt: null, parentId: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: COMMENT_INCLUDE,
    });
    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    return {
      data: trimmed.map((r) => toCommentDto(r as unknown as CommentWithAuthor)),
      meta: {
        nextCursor: hasMore ? trimmed[trimmed.length - 1]!.id : null,
        hasMore,
        limit,
      },
    };
  }

  async delete(viewerId: string, commentId: string): Promise<void> {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, deletedAt: null },
      select: { id: true, authorId: true },
    });
    if (!comment) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Comment not found.", 404);
    }
    if (comment.authorId !== viewerId) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "You cannot delete someone else's comment.",
        403,
      );
    }
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }
}
