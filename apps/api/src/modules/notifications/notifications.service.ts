import { Injectable, Logger } from "@nestjs/common";
import {
  type CursorPageMeta,
  ErrorCode,
  type MarkNotificationsReadBody,
  type Notification as NotificationDto,
  type NotificationType,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsBus } from "./notifications.bus";

interface NotificationRow {
  id: string;
  type: NotificationType;
  actorId: string | null;
  recipientId: string;
  postId: string | null;
  commentId: string | null;
  connectionId: string | null;
  messageId: string | null;
  jobId: string | null;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
  actor: {
    id: string;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  } | null;
}

export interface CreateNotificationInput {
  type: NotificationType;
  recipientId: string;
  actorId?: string | null;
  postId?: string | null;
  commentId?: string | null;
  connectionId?: string | null;
  messageId?: string | null;
  jobId?: string | null;
  data?: Record<string, unknown> | null;
  /**
   * If set, will skip creation when an equivalent unread notification already
   * exists — avoids "Alice liked your post × 12" spam when the user toggles.
   */
  dedupe?: boolean;
}

const ACTOR_INCLUDE = {
  actor: {
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
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: NotificationsBus,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // Emission — called by reactions, comments, connections, messaging.
  // Swallow errors: a notification failure should never break the actual
  // user action.
  // ─────────────────────────────────────────────────────────────────────

  async notify(input: CreateNotificationInput): Promise<void> {
    try {
      // No self-notifications.
      if (input.actorId && input.actorId === input.recipientId) return;

      if (input.dedupe) {
        const existing = await this.prisma.notification.findFirst({
          where: {
            recipientId: input.recipientId,
            type: input.type,
            actorId: input.actorId ?? null,
            postId: input.postId ?? null,
            commentId: input.commentId ?? null,
            connectionId: input.connectionId ?? null,
            messageId: input.messageId ?? null,
            jobId: input.jobId ?? null,
            readAt: null,
          },
          select: { id: true },
        });
        if (existing) return;
      }

      const row = (await this.prisma.notification.create({
        data: {
          type: input.type,
          recipientId: input.recipientId,
          actorId: input.actorId ?? null,
          postId: input.postId ?? null,
          commentId: input.commentId ?? null,
          connectionId: input.connectionId ?? null,
          messageId: input.messageId ?? null,
          jobId: input.jobId ?? null,
          data: (input.data ?? null) as never,
        },
        include: ACTOR_INCLUDE,
      })) as unknown as NotificationRow;

      const dto = toDto(row);
      this.bus.publish(input.recipientId, {
        type: "notification.new",
        payload: dto,
      });
      const count = await this.countUnread(input.recipientId);
      this.bus.publish(input.recipientId, {
        type: "notification.unread-count",
        payload: { count },
      });
    } catch (err) {
      this.log.warn(
        `Failed to create notification (type=${input.type}, recipient=${input.recipientId}): ${(err as Error).message}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Reads
  // ─────────────────────────────────────────────────────────────────────

  async list(
    viewerId: string,
    cursor: string | null,
    limit: number,
  ): Promise<{ data: NotificationDto[]; meta: CursorPageMeta }> {
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = (await this.prisma.notification.findMany({
      where: { recipientId: viewerId },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: ACTOR_INCLUDE,
    })) as unknown as NotificationRow[];
    const hasMore = rows.length > take;
    const trimmed = hasMore ? rows.slice(0, take) : rows;
    return {
      data: trimmed.map(toDto),
      meta: {
        nextCursor: hasMore ? (trimmed[trimmed.length - 1]?.id ?? null) : null,
        hasMore,
        limit: take,
      },
    };
  }

  async countUnread(viewerId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: viewerId, readAt: null },
    });
  }

  async markRead(
    viewerId: string,
    body: MarkNotificationsReadBody,
  ): Promise<{ count: number }> {
    if (!body.all && (!body.ids || body.ids.length === 0)) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "Either ids or all=true must be provided.",
        400,
      );
    }
    const at = new Date();
    const where = body.all
      ? { recipientId: viewerId, readAt: null }
      : {
          recipientId: viewerId,
          id: { in: body.ids ?? [] },
          readAt: null,
        };
    const result = await this.prisma.notification.updateMany({
      where,
      data: { readAt: at },
    });

    this.bus.publish(viewerId, {
      type: "notification.read",
      payload: { ids: body.ids ?? [], at: at.toISOString() },
    });
    const count = await this.countUnread(viewerId);
    this.bus.publish(viewerId, {
      type: "notification.unread-count",
      payload: { count },
    });
    return { count: result.count };
  }
}

function toDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    actorId: row.actorId,
    postId: row.postId,
    commentId: row.commentId,
    connectionId: row.connectionId,
    messageId: row.messageId,
    jobId: row.jobId,
    data: (row.data as Record<string, unknown> | null) ?? null,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    actor:
      row.actor && row.actor.profile
        ? {
            id: row.actor.id,
            handle: row.actor.profile.handle,
            firstName: row.actor.profile.firstName,
            lastName: row.actor.profile.lastName,
            avatarUrl: row.actor.profile.avatarUrl,
          }
        : null,
  };
}
