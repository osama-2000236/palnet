import {
  type CursorPageMeta,
  ErrorCode,
  type MarkNotificationsReadBody,
  type Notification as NotificationDto,
  type NotificationChannel,
  type NotificationEvent,
  NotificationPreferences,
  type NotificationType,
} from "@baydar/shared";
import { Injectable, Logger } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { NotificationsBus } from "./notifications.bus";
import { PushService } from "./push.service";

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

const TYPE_TO_EVENT: Record<NotificationType, NotificationEvent | null> = {
  CONNECTION_REQUEST: "connections",
  CONNECTION_ACCEPTED: "connections",
  POST_REACTION: "reactions",
  POST_COMMENT: "comments",
  POST_MENTION: "comments",
  MESSAGE_RECEIVED: "messages",
  JOB_APPLICATION_UPDATE: "jobs",
  PROFILE_VIEW: null,
  MODERATION_USER_SUSPENDED: null,
  MODERATION_USER_UNSUSPENDED: null,
  MODERATION_POST_TAKEDOWN: null,
  MODERATION_POST_RESTORED: null,
  MODERATION_APPEAL_REVIEWED: null,
};

@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: NotificationsBus,
    private readonly push: PushService,
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

      const event = TYPE_TO_EVENT[input.type];
      const recipient = await this.prisma.user.findUnique({
        where: { id: input.recipientId },
        select: { notificationPrefs: true, isActive: true },
      });
      if (!recipient || !recipient.isActive) return;

      const prefs = mergePrefs(recipient.notificationPrefs ?? null);
      if (event && !this.isEnabled(prefs, "inApp", event)) return;

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
      if (event && this.isEnabled(prefs, "push", event)) {
        void this.push.sendNotification(input.recipientId, dto).catch((err) => {
          this.log.warn(
            `Failed to enqueue push notification (type=${input.type}, recipient=${input.recipientId}): ${(err as Error).message}`,
          );
        });
      }
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

  async markRead(viewerId: string, body: MarkNotificationsReadBody): Promise<{ count: number }> {
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

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    return mergePrefs(row?.notificationPrefs ?? null);
  }

  async updatePreferences(
    userId: string,
    prefs: NotificationPreferences,
  ): Promise<NotificationPreferences> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: prefs as never },
    });
    return prefs;
  }

  private isEnabled(
    prefs: NotificationPreferences,
    channel: NotificationChannel,
    event: NotificationEvent,
  ): boolean {
    return prefs[channel][event] === true;
  }
}

const DEFAULT_PREFS: NotificationPreferences = {
  inApp: {
    connections: true,
    messages: true,
    reactions: true,
    comments: true,
    jobs: true,
  },
  email: {
    connections: true,
    messages: true,
    reactions: false,
    comments: false,
    jobs: true,
  },
  push: {
    connections: true,
    messages: true,
    reactions: true,
    comments: true,
    jobs: true,
  },
};

function mergePrefs(stored: unknown): NotificationPreferences {
  if (!stored || typeof stored !== "object") return DEFAULT_PREFS;
  const source = stored as Record<string, Record<string, unknown>>;
  const pick = (key: NotificationChannel): NotificationPreferences["inApp"] => {
    const row = source[key] ?? {};
    const base = DEFAULT_PREFS[key];
    return {
      connections: typeof row.connections === "boolean" ? row.connections : base.connections,
      messages: typeof row.messages === "boolean" ? row.messages : base.messages,
      reactions: typeof row.reactions === "boolean" ? row.reactions : base.reactions,
      comments: typeof row.comments === "boolean" ? row.comments : base.comments,
      jobs: typeof row.jobs === "boolean" ? row.jobs : base.jobs,
    };
  };
  return NotificationPreferences.parse({
    inApp: pick("inApp"),
    email: pick("email"),
    push: pick("push"),
  });
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
