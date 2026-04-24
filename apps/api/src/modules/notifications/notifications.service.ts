import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type CursorPageMeta,
  ErrorCode,
  type MarkNotificationsReadBody,
  type Notification as NotificationDto,
  type NotificationChannel,
  type NotificationEvent,
  NotificationPreferences,
  type NotificationType,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import type { Env } from "../../config/env";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

import { NotificationsBus } from "./notifications.bus";

// Map DB notification types to the coarser "event buckets" exposed in the
// user-facing preferences UI. PROFILE_VIEW intentionally has no bucket — those
// are always silent in-app only.
const TYPE_TO_EVENT: Record<NotificationType, NotificationEvent | null> = {
  CONNECTION_REQUEST: "connections",
  CONNECTION_ACCEPTED: "connections",
  POST_REACTION: "reactions",
  POST_COMMENT: "comments",
  POST_MENTION: "comments",
  MESSAGE_RECEIVED: "messages",
  JOB_APPLICATION_UPDATE: "jobs",
  PROFILE_VIEW: null,
  // Moderation outcomes are not user-muteable: no pref bucket, so the in-app
  // row is always created and no email/push fanout happens by default.
  MODERATION_USER_SUSPENDED: null,
  MODERATION_USER_UNSUSPENDED: null,
  MODERATION_POST_TAKEDOWN: null,
  MODERATION_POST_RESTORED: null,
  MODERATION_APPEAL_REVIEWED: null,
};

// Human-readable template per notification type for the email/push subject +
// body. Kept minimal — deep-linking pulls the user back into the app for
// context.
const TYPE_COPY: Record<
  NotificationType,
  { subject: (actor: string) => string; body: (actor: string) => string }
> = {
  CONNECTION_REQUEST: {
    subject: (a) => `${a} wants to connect`,
    body: (a) => `${a} sent you a connection request on Baydar.`,
  },
  CONNECTION_ACCEPTED: {
    subject: (a) => `${a} accepted your connection`,
    body: (a) => `${a} accepted your connection request.`,
  },
  POST_REACTION: {
    subject: (a) => `${a} reacted to your post`,
    body: (a) => `${a} reacted to something you posted.`,
  },
  POST_COMMENT: {
    subject: (a) => `${a} commented on your post`,
    body: (a) => `${a} left a comment on your post.`,
  },
  POST_MENTION: {
    subject: (a) => `${a} mentioned you`,
    body: (a) => `${a} mentioned you in a post.`,
  },
  MESSAGE_RECEIVED: {
    subject: (a) => `${a} sent you a message`,
    body: (a) => `${a} sent you a message on Baydar.`,
  },
  JOB_APPLICATION_UPDATE: {
    subject: () => `Your job application has an update`,
    body: () => `One of your job applications changed status.`,
  },
  PROFILE_VIEW: {
    subject: (a) => `${a} viewed your profile`,
    body: (a) => `${a} viewed your profile.`,
  },
  MODERATION_USER_SUSPENDED: {
    subject: () => `Your Baydar account has been suspended`,
    body: () => `Your account has been suspended by moderators.`,
  },
  MODERATION_USER_UNSUSPENDED: {
    subject: () => `Your Baydar suspension has been lifted`,
    body: () => `Your account suspension has been lifted.`,
  },
  MODERATION_POST_TAKEDOWN: {
    subject: () => `Your post was removed by moderators`,
    body: () => `A post of yours was taken down by moderators.`,
  },
  MODERATION_POST_RESTORED: {
    subject: () => `Your post has been restored`,
    body: () => `A post of yours was restored by moderators.`,
  },
  MODERATION_APPEAL_REVIEWED: {
    subject: () => `Your appeal has been reviewed`,
    body: () => `Moderators reviewed your appeal.`,
  },
};

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
    private readonly mail: MailService,
    private readonly config: ConfigService<Env, true>,
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

      // Load prefs + recipient email once. We need the email regardless of
      // email-channel preference (we might still SSE-push).
      const recipient = await this.prisma.user.findUnique({
        where: { id: input.recipientId },
        select: { email: true, notificationPrefs: true, isActive: true },
      });
      if (!recipient || !recipient.isActive) return;

      const prefs = mergePrefs(recipient.notificationPrefs ?? null);

      // In-app preference is the master switch — opt-out means we don't even
      // create a DB row, so the notifications tab never shows the event.
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
      const count = await this.countUnread(input.recipientId);
      this.bus.publish(input.recipientId, {
        type: "notification.unread-count",
        payload: { count },
      });

      // Side-channel fanout. Errors here must never bubble — they're
      // already-logged best-effort.
      const actorName = row.actor?.profile
        ? `${row.actor.profile.firstName} ${row.actor.profile.lastName}`.trim()
        : "Someone";
      if (event && this.isEnabled(prefs, "email", event)) {
        void this.sendEmail(recipient.email, input.type, actorName).catch((err) =>
          this.log.warn(`Notification email failed: ${(err as Error).message}`),
        );
      }
      if (event && this.isEnabled(prefs, "push", event)) {
        void this.sendPush(input.recipientId, input.type, actorName).catch((err) =>
          this.log.warn(`Notification push failed: ${(err as Error).message}`),
        );
      }
    } catch (err) {
      this.log.warn(
        `Failed to create notification (type=${input.type}, recipient=${input.recipientId}): ${(err as Error).message}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Channel helpers
  // ─────────────────────────────────────────────────────────────────────

  private isEnabled(
    prefs: NotificationPreferences,
    channel: NotificationChannel,
    event: NotificationEvent,
  ): boolean {
    return prefs[channel][event] === true;
  }

  private async sendEmail(to: string, type: NotificationType, actorName: string): Promise<void> {
    const copy = TYPE_COPY[type];
    // Notifications always deep-link into the in-app notifications screen —
    // the actual surface (post, thread, profile) is opened from there.
    const webBase = new URL(this.config.getOrThrow<string>("EMAIL_VERIFY_URL_BASE"));
    webBase.pathname = "/notifications";
    webBase.search = "";
    await this.mail.sendNotificationEmail(to, {
      subject: copy.subject(actorName),
      body: copy.body(actorName),
      ctaLabel: "Open Baydar",
      ctaLink: webBase.toString(),
    });
  }

  // Push fanout via Expo Push API. Expo handles APNs/FCM for us so we only
  // need a single HTTPS POST per notification. Batches of up to 100 are
  // allowed per request; in practice one user rarely has >3 devices so we
  // just send a single batch. Tokens marked invalid by Expo get pruned.
  private async sendPush(userId: string, type: NotificationType, actorName: string): Promise<void> {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) {
      this.log.debug(`[push] user=${userId} no registered devices`);
      return;
    }
    // Filter to Expo-format tokens. Anything else (raw FCM/APNs) is
    // silently dropped — we only speak Expo from the mobile client.
    const expoTokens = tokens
      .map((t) => t.token)
      .filter((t) => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["));
    if (expoTokens.length === 0) return;

    const copy = TYPE_COPY[type];
    const messages = expoTokens.map((to) => ({
      to,
      title: copy.subject(actorName),
      body: copy.body(actorName),
      sound: "default" as const,
      data: { type, userId },
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "accept-encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      this.log.warn(`Expo push HTTP ${res.status}`);
      return;
    }
    const json = (await res.json()) as {
      data?: Array<{ status: string; message?: string; details?: { error?: string } }>;
    };
    const receipts = json.data ?? [];
    // Prune tokens Expo reports as DeviceNotRegistered — they're dead.
    const dead: string[] = [];
    receipts.forEach((r, i) => {
      if (r.status === "error" && r.details?.error === "DeviceNotRegistered") {
        const tok = expoTokens[i];
        if (tok) dead.push(tok);
      }
    });
    if (dead.length > 0) {
      await this.prisma.pushToken.deleteMany({
        where: { token: { in: dead } },
      });
      this.log.debug(`[push] pruned ${dead.length} dead tokens`);
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

  // ─────────────────────────────────────────────────────────────────────
  // Preferences
  // ─────────────────────────────────────────────────────────────────────

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
}

// Missing/partial stored prefs default to "opt-in" so newly-introduced events
// don't silently go dark. Validated through the Zod schema to drop anything
// legacy/corrupt.
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
  const s = stored as Record<string, Record<string, unknown>>;
  const pick = (key: "inApp" | "email" | "push"): NotificationPreferences["inApp"] => {
    const row = s[key] ?? {};
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
