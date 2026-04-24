import { Injectable } from "@nestjs/common";
import {
  type ChatRoom as ChatRoomDto,
  ErrorCode,
  type Message as MessageDto,
  NotificationType,
  type SendMessageBody,
} from "@palnet/shared";

import { DomainException } from "../../common/domain-exception";
import { ModerationService } from "../moderation/moderation.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import { MessagingBus } from "./messaging.bus";

interface MessageRow {
  id: string;
  roomId: string;
  authorId: string;
  body: string;
  mediaUrl: string | null;
  clientMessageId: string | null;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

interface MemberRow {
  userId: string;
  lastReadAt: Date | null;
  user: {
    lastSeenAt: Date | null;
    profile: {
      handle: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
}

interface RoomRow {
  id: string;
  isGroup: boolean;
  title: string | null;
  updatedAt: Date;
  members: MemberRow[];
  messages: MessageRow[];
}

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: MessagingBus,
    private readonly notifications: NotificationsService,
    private readonly moderation: ModerationService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // Rooms
  // ─────────────────────────────────────────────────────────────────────

  async findOrCreateDm(
    viewerId: string,
    otherUserId: string,
  ): Promise<ChatRoomDto> {
    if (otherUserId === viewerId) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "Cannot open a DM with yourself.",
        400,
      );
    }
    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true },
    });
    if (!other) {
      throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);
    }

    // Blocks are symmetric: if either side blocked the other, neither can
    // open a DM. We surface as NOT_FOUND rather than a distinct code so
    // the target can't confirm whether they've been blocked.
    const blocked = await this.moderation.blockedIds(viewerId);
    if (blocked.includes(otherUserId)) {
      throw new DomainException(ErrorCode.NOT_FOUND, "User not found.", 404);
    }

    // Find an existing 1:1 room where both users are members.
    const existing = await this.prisma.chatRoom.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: viewerId } } },
          { members: { some: { userId: otherUserId } } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return this.getRoomDto(existing.id, viewerId);
    }

    // Create a new 1:1 room with both members atomically.
    const created = await this.prisma.chatRoom.create({
      data: {
        isGroup: false,
        members: {
          create: [{ userId: viewerId }, { userId: otherUserId }],
        },
      },
      select: { id: true },
    });
    return this.getRoomDto(created.id, viewerId);
  }

  async listMyRooms(
    viewerId: string,
    opts: { archived?: boolean } = {},
  ): Promise<ChatRoomDto[]> {
    const archived = opts.archived === true;
    const blocked = await this.moderation.blockedIds(viewerId);
    const rooms = (await this.prisma.chatRoom.findMany({
      where: {
        members: {
          some: {
            userId: viewerId,
            // Default list: only rows the viewer hasn't archived.
            // archived=true returns only their archived rows.
            archivedAt: archived ? { not: null } : null,
          },
        },
        // Drop 1:1 rooms whose only other member is on either side of a
        // block with the viewer. Group rooms stay — a block in a group
        // conversation silences the blocked user's messages but doesn't
        // kick the viewer out.
        ...(blocked.length > 0
          ? {
              NOT: {
                AND: [
                  { isGroup: false },
                  { members: { some: { userId: { in: blocked } } } },
                ],
              },
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        members: {
          include: {
            user: {
              select: {
                lastSeenAt: true,
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
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })) as unknown as RoomRow[];

    return Promise.all(
      rooms.map((row) => this.toChatRoomDto(row, viewerId)),
    );
  }

  async getRoomDto(roomId: string, viewerId: string): Promise<ChatRoomDto> {
    const row = (await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        members: { some: { userId: viewerId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                lastSeenAt: true,
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
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })) as unknown as RoomRow | null;
    if (!row) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Room not found.", 404);
    }
    return this.toChatRoomDto(row, viewerId);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Messages
  // ─────────────────────────────────────────────────────────────────────

  async listMessages(
    viewerId: string,
    roomId: string,
    after: string | null | undefined,
    limit: number,
  ): Promise<{ data: MessageDto[]; nextCursor: string | null; hasMore: boolean; limit: number }> {
    await this.requireMembership(viewerId, roomId);
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = (await this.prisma.message.findMany({
      where: { roomId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(after ? { cursor: { id: after }, skip: 1 } : {}),
    })) as unknown as MessageRow[];
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return {
      data: page.map(toMessageDto),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
      hasMore,
      limit: take,
    };
  }

  async sendMessage(
    viewerId: string,
    roomId: string,
    body: SendMessageBody,
  ): Promise<MessageDto> {
    await this.requireMembership(viewerId, roomId);

    // Idempotency via (roomId, authorId, clientMessageId) unique.
    const existing = (await this.prisma.message.findFirst({
      where: {
        roomId,
        authorId: viewerId,
        clientMessageId: body.clientMessageId,
      },
    })) as unknown as MessageRow | null;
    if (existing) {
      return toMessageDto(existing);
    }

    const created = (await this.prisma.message.create({
      data: {
        roomId,
        authorId: viewerId,
        body: body.body,
        mediaUrl: body.mediaUrl ?? null,
        clientMessageId: body.clientMessageId,
      },
    })) as unknown as MessageRow;

    // Bump room.updatedAt so listings re-sort.
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    // A new message resurfaces the room for every member who'd archived it —
    // mirrors what mainstream messengers do. Archiver (the viewer) is left
    // untouched: they might want their own thread to stay archived.
    await this.prisma.chatRoomMember.updateMany({
      where: {
        roomId,
        userId: { not: viewerId },
        archivedAt: { not: null },
      },
      data: { archivedAt: null },
    });

    const dto = toMessageDto(created);

    // Fan out to every member except the author's other tabs also get it so
    // optimistic UI can reconcile. Everyone in the room receives the event.
    const members = await this.prisma.chatRoomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    for (const m of members) {
      this.bus.publish(m.userId, { type: "message.new", payload: dto });
    }

    // Drop a dedup'd notification on every OTHER member. We intentionally
    // leave messageId null and record roomId in `data` so the dedup key is
    // (type, recipient, actor) — a DM burst collapses into one unread entry.
    for (const m of members) {
      if (m.userId === viewerId) continue;
      void this.notifications.notify({
        type: NotificationType.MESSAGE_RECEIVED,
        recipientId: m.userId,
        actorId: viewerId,
        data: { roomId, lastMessageId: dto.id },
        dedupe: true,
      });
    }

    return dto;
  }

  /**
   * Broadcast a "typing" signal to every OTHER member of the room. Pure
   * in-memory fan-out via the MessagingBus — nothing is persisted. Clients
   * debounce these calls (one every ~3s while actively typing) and apply a
   * 5-second client-side expiry so the bubble disappears when keystrokes stop.
   */
  async publishTyping(viewerId: string, roomId: string): Promise<void> {
    await this.requireMembership(viewerId, roomId);
    const members = await this.prisma.chatRoomMember.findMany({
      where: { roomId, userId: { not: viewerId } },
      select: { userId: true },
    });
    for (const m of members) {
      this.bus.publish(m.userId, {
        type: "typing",
        payload: { roomId, userId: viewerId },
      });
    }
  }

  async markRead(viewerId: string, roomId: string): Promise<void> {
    await this.requireMembership(viewerId, roomId);
    const at = new Date();
    await this.prisma.chatRoomMember.updateMany({
      where: { roomId, userId: viewerId },
      data: { lastReadAt: at },
    });

    // Tell the room that this user has read up to `at`.
    const members = await this.prisma.chatRoomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    for (const m of members) {
      this.bus.publish(m.userId, {
        type: "message.read",
        payload: { roomId, userId: viewerId, at: at.toISOString() },
      });
    }
  }

  /**
   * Archive a room for the viewer only. Idempotent: if already archived,
   * the timestamp is left alone so clients can safely retry on network
   * flakes without losing the original archive time.
   */
  async archiveRoom(viewerId: string, roomId: string): Promise<void> {
    await this.requireMembership(viewerId, roomId);
    await this.prisma.chatRoomMember.updateMany({
      where: { roomId, userId: viewerId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
  }

  /** Restore a previously archived room. Idempotent. */
  async unarchiveRoom(viewerId: string, roomId: string): Promise<void> {
    await this.requireMembership(viewerId, roomId);
    await this.prisma.chatRoomMember.updateMany({
      where: { roomId, userId: viewerId, archivedAt: { not: null } },
      data: { archivedAt: null },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────

  private async requireMembership(
    userId: string,
    roomId: string,
  ): Promise<void> {
    const m = await this.prisma.chatRoomMember.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!m) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Room not found.", 404);
    }

    // For 1:1 rooms, a block between the two members slams the door shut
    // for BOTH sides — list/send/mark-read all 404. Group rooms stay
    // reachable; silencing is handled by the UI (muting the blocked user's
    // messages on render).
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        isGroup: true,
        members: { select: { userId: true } },
      },
    });
    if (room && !room.isGroup) {
      const other = room.members.find((mm) => mm.userId !== userId);
      if (other) {
        const blocked = await this.moderation.blockedIds(userId);
        if (blocked.includes(other.userId)) {
          throw new DomainException(ErrorCode.NOT_FOUND, "Room not found.", 404);
        }
      }
    }
  }

  private async toChatRoomDto(
    row: RoomRow,
    viewerId: string,
  ): Promise<ChatRoomDto> {
    const lastMessage = row.messages[0]
      ? toMessageDto(row.messages[0])
      : null;

    // Unread count = messages authored by others after this member's lastReadAt.
    const me = row.members.find((m) => m.userId === viewerId);
    const lastReadAt = me?.lastReadAt ?? null;
    const unreadCount = await this.prisma.message.count({
      where: {
        roomId: row.id,
        deletedAt: null,
        authorId: { not: viewerId },
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      },
    });

    return {
      id: row.id,
      isGroup: row.isGroup,
      title: row.title,
      lastMessage,
      unreadCount,
      members: row.members.map((m) => ({
        userId: m.userId,
        handle: m.user.profile?.handle ?? m.userId,
        firstName: m.user.profile?.firstName ?? "",
        lastName: m.user.profile?.lastName ?? "",
        avatarUrl: m.user.profile?.avatarUrl ?? null,
        lastReadAt: m.lastReadAt ? m.lastReadAt.toISOString() : null,
        lastSeenAt: m.user.lastSeenAt ? m.user.lastSeenAt.toISOString() : null,
      })),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function toMessageDto(row: MessageRow): MessageDto {
  return {
    id: row.id,
    roomId: row.roomId,
    authorId: row.authorId,
    body: row.body,
    mediaUrl: row.mediaUrl ?? null,
    clientMessageId: row.clientMessageId ?? null,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
  };
}
