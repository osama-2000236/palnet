import { Prisma } from "@baydar/db";
import {
  type ChatRoom as ChatRoomDto,
  type CreateGroupRoomBody,
  ErrorCode,
  type Message as MessageDto,
  NotificationType,
  type SendMessageBody,
  type UpdateMessageBody,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

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

interface MessageWithRoomRow extends MessageRow {
  room: {
    members: Array<{ userId: string }>;
  };
}

interface MemberRow {
  userId: string;
  lastReadAt: Date | null;
  lastReadMessageId: string | null;
  user: {
    deletedAt: Date | null;
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
    private readonly safety: SafetyService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // Rooms
  // ─────────────────────────────────────────────────────────────────────

  async findOrCreateDm(viewerId: string, otherUserId: string): Promise<ChatRoomDto> {
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

  async createGroupRoom(viewerId: string, body: CreateGroupRoomBody): Promise<ChatRoomDto> {
    const memberIds = Array.from(new Set(body.memberIds.filter((id) => id !== viewerId)));
    if (memberIds.length < 2) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        "Group rooms need at least two other members.",
        400,
      );
    }

    const accepted = await this.prisma.connection.count({
      where: {
        status: "ACCEPTED",
        OR: memberIds.flatMap((memberId) => [
          { requesterId: viewerId, receiverId: memberId },
          { requesterId: memberId, receiverId: viewerId },
        ]),
      },
    });
    if (accepted !== memberIds.length) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "Group members must be accepted connections.",
        403,
      );
    }

    const created = await this.prisma.chatRoom.create({
      data: {
        isGroup: true,
        title: body.title.trim(),
        members: {
          create: [viewerId, ...memberIds].map((userId) => ({ userId })),
        },
      },
      select: { id: true },
    });
    return this.getRoomDto(created.id, viewerId);
  }

  async listMyRooms(viewerId: string): Promise<ChatRoomDto[]> {
    const excludedUserIds = await this.safety.getBlockedEitherIds(viewerId);
    const rooms = (await this.prisma.chatRoom.findMany({
      where: {
        members: { some: { userId: viewerId, archivedAt: null } },
        NOT: excludedUserIds.length
          ? { isGroup: false, members: { some: { userId: { in: excludedUserIds } } } }
          : undefined,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        members: {
          include: {
            user: {
              select: {
                lastSeenAt: true,
                deletedAt: true,
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
          where: excludedUserIds.length ? { authorId: { notIn: excludedUserIds } } : undefined,
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })) as unknown as RoomRow[];

    const unreadByRoom = await this.getUnreadCounts(
      viewerId,
      rooms.map((r) => r.id),
      excludedUserIds,
    );
    const acceptedPeerIds = await this.getAcceptedPeerIds(viewerId, dmPeerIds(rooms, viewerId));

    return rooms.map((row) =>
      this.toChatRoomDto(
        row,
        viewerId,
        unreadByRoom.get(row.id) ?? 0,
        isRequestRoom(row, viewerId, acceptedPeerIds),
      ),
    );
  }

  async getRoomDto(roomId: string, viewerId: string): Promise<ChatRoomDto> {
    const excludedUserIds = await this.safety.getBlockedEitherIds(viewerId);
    const row = (await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        members: { some: { userId: viewerId } },
        NOT: excludedUserIds.length
          ? { isGroup: false, members: { some: { userId: { in: excludedUserIds } } } }
          : undefined,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                lastSeenAt: true,
                deletedAt: true,
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
          where: excludedUserIds.length ? { authorId: { notIn: excludedUserIds } } : undefined,
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })) as unknown as RoomRow | null;
    if (!row) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Room not found.", 404);
    }
    const unreadByRoom = await this.getUnreadCounts(viewerId, [row.id], excludedUserIds);
    const acceptedPeerIds = await this.getAcceptedPeerIds(viewerId, dmPeerIds([row], viewerId));
    return this.toChatRoomDto(
      row,
      viewerId,
      unreadByRoom.get(row.id) ?? 0,
      isRequestRoom(row, viewerId, acceptedPeerIds),
    );
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
    const excludedUserIds = await this.safety.getBlockedEitherIds(viewerId);
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = (await this.prisma.message.findMany({
      where: {
        roomId,
        ...(excludedUserIds.length ? { authorId: { notIn: excludedUserIds } } : {}),
      },
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

  async sendMessage(viewerId: string, roomId: string, body: SendMessageBody): Promise<MessageDto> {
    await this.requireMembership(viewerId, roomId);
    const members = await this.prisma.chatRoomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    await this.rejectBlockedRoomSend(
      viewerId,
      members.map((m) => m.userId),
    );

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

    // Bump room.updatedAt so listings re-sort, and mark the sender as having
    // "read" their own message so their unread count doesn't tick.
    await Promise.all([
      this.prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      }),
      this.prisma.chatRoomMember.updateMany({
        where: { roomId, userId: viewerId },
        data: {
          lastReadAt: created.createdAt,
          lastReadMessageId: created.id,
        } as never,
      }),
    ]);

    const dto = toMessageDto(created);

    // Fan out to every member except the author's other tabs also get it so
    // optimistic UI can reconcile. Everyone in the room receives the event.
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

  async editMessage(
    viewerId: string,
    messageId: string,
    body: UpdateMessageBody,
  ): Promise<MessageDto> {
    const row = (await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { room: { select: { members: { select: { userId: true } } } } },
    })) as unknown as MessageWithRoomRow | null;
    if (!row) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Message not found.", 404);
    }
    if (!row.room.members.some((m) => m.userId === viewerId)) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Message not found.", 404);
    }
    if (row.authorId !== viewerId) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "Only the sender can edit this message.",
        403,
      );
    }
    if (row.deletedAt) {
      throw new DomainException(ErrorCode.CONFLICT, "Deleted messages cannot be edited.", 409);
    }
    if (Date.now() - row.createdAt.getTime() > 15 * 60 * 1000) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "Messages can only be edited for 15 minutes.",
        403,
      );
    }

    const updated = (await this.prisma.message.update({
      where: { id: messageId },
      data: { body: body.body.trim(), editedAt: new Date() },
    })) as unknown as MessageRow;
    const dto = toMessageDto(updated);
    for (const m of row.room.members) {
      this.bus.publish(m.userId, { type: "message.edited", payload: dto });
    }
    return dto;
  }

  async deleteMessage(viewerId: string, messageId: string): Promise<MessageDto> {
    const row = (await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { room: { select: { members: { select: { userId: true } } } } },
    })) as unknown as MessageWithRoomRow | null;
    if (!row) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Message not found.", 404);
    }
    if (!row.room.members.some((m) => m.userId === viewerId)) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Message not found.", 404);
    }
    if (row.authorId !== viewerId) {
      throw new DomainException(
        ErrorCode.AUTH_FORBIDDEN,
        "Only the sender can delete this message.",
        403,
      );
    }

    const deleted = (await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: row.deletedAt ?? new Date() },
    })) as unknown as MessageRow;
    const dto = toMessageDto(deleted);
    for (const m of row.room.members) {
      this.bus.publish(m.userId, { type: "message.deleted", payload: dto });
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
    const latest = await this.prisma.message.findFirst({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    await this.prisma.chatRoomMember.updateMany({
      where: { roomId, userId: viewerId },
      data: {
        lastReadAt: at,
        lastReadMessageId: latest?.id ?? null,
      } as never,
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

  async archiveRoom(viewerId: string, roomId: string): Promise<void> {
    await this.requireMembership(viewerId, roomId);
    await this.prisma.chatRoomMember.updateMany({
      where: { roomId, userId: viewerId },
      data: { archivedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────

  private async requireMembership(userId: string, roomId: string): Promise<void> {
    const m = await this.prisma.chatRoomMember.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });
    if (!m) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Room not found.", 404);
    }
  }

  /**
   * Batched unread-count lookup. One SQL round trip resolves every room's
   * unread count using each member's denormalized `lastReadMessageId` as the
   * cutoff (falling back to "all messages" when the user has never read).
   * Replaces the per-room `message.count()` loop that scaled O(rooms).
   */
  private async getUnreadCounts(
    viewerId: string,
    roomIds: string[],
    excludedUserIds: string[],
  ): Promise<Map<string, number>> {
    if (roomIds.length === 0) return new Map();
    const excluded = [viewerId, ...excludedUserIds];
    const rows = await this.prisma.$queryRaw<Array<{ roomId: string; unread: bigint }>>(Prisma.sql`
      WITH cursors AS (
        SELECT
          m."roomId",
          (
            SELECT msg."createdAt"
            FROM   "Message" msg
            WHERE  msg."id" = m."lastReadMessageId"
          ) AS cutoff_at
        FROM   "ChatRoomMember" m
        WHERE  m."userId" = ${viewerId}
          AND  m."roomId" IN (${Prisma.join(roomIds)})
      )
      SELECT
        msg."roomId"          AS "roomId",
        COUNT(*)::bigint      AS "unread"
      FROM   "Message" msg
      JOIN   cursors    c     ON c."roomId" = msg."roomId"
      WHERE  msg."deletedAt" IS NULL
        AND  msg."authorId" NOT IN (${Prisma.join(excluded)})
        AND  (c.cutoff_at IS NULL OR msg."createdAt" > c.cutoff_at)
      GROUP  BY msg."roomId"
    `);
    return new Map(rows.map((r) => [r.roomId, Number(r.unread)]));
  }

  // Message requests are derived, not stored: a 1:1 room whose counterpart is
  // not an accepted connection renders under the "Requests" tab client-side.
  private async getAcceptedPeerIds(viewerId: string, peerIds: string[]): Promise<Set<string>> {
    if (peerIds.length === 0) return new Set();
    const rows = await this.prisma.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: viewerId, receiverId: { in: peerIds } },
          { receiverId: viewerId, requesterId: { in: peerIds } },
        ],
      },
      select: { requesterId: true, receiverId: true },
    });
    return new Set(rows.map((r) => (r.requesterId === viewerId ? r.receiverId : r.requesterId)));
  }

  private toChatRoomDto(
    row: RoomRow,
    viewerId: string,
    unreadCount: number,
    isRequest = false,
  ): ChatRoomDto {
    const lastMessage = row.messages[0] ? toMessageDto(row.messages[0]) : null;
    return {
      id: row.id,
      isGroup: row.isGroup,
      title: row.title,
      lastMessage,
      unreadCount,
      isRequest,
      members: row.members.map((m) => ({
        userId: m.userId,
        handle: m.user.deletedAt ? m.userId : (m.user.profile?.handle ?? m.userId),
        firstName: m.user.deletedAt ? "Deleted user" : (m.user.profile?.firstName ?? ""),
        lastName: m.user.deletedAt ? "" : (m.user.profile?.lastName ?? ""),
        avatarUrl: m.user.deletedAt ? null : (m.user.profile?.avatarUrl ?? null),
        lastReadAt: m.lastReadAt ? m.lastReadAt.toISOString() : null,
        lastSeenAt: m.user.lastSeenAt ? m.user.lastSeenAt.toISOString() : null,
      })),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async rejectBlockedRoomSend(viewerId: string, memberIds: string[]): Promise<void> {
    const otherMemberIds = memberIds.filter((id) => id !== viewerId);
    if (otherMemberIds.length === 0) return;
    const blocked = await this.prisma.blockedUser.count({
      where: {
        OR: otherMemberIds.flatMap((memberId) => [
          { blockerId: viewerId, blockedId: memberId },
          { blockerId: memberId, blockedId: viewerId },
        ]),
      },
    });
    if (blocked > 0) {
      throw new DomainException(
        ErrorCode.BLOCKED,
        "Messaging is blocked between these users.",
        403,
      );
    }
  }
}

function dmPeerIds(rooms: RoomRow[], viewerId: string): string[] {
  return Array.from(
    new Set(
      rooms
        .filter((room) => !room.isGroup)
        .flatMap((room) =>
          room.members.map((m) => m.userId).filter((userId) => userId !== viewerId),
        ),
    ),
  );
}

function isRequestRoom(row: RoomRow, viewerId: string, acceptedPeerIds: Set<string>): boolean {
  if (row.isGroup) return false;
  const peer = row.members.find((m) => m.userId !== viewerId);
  return peer ? !acceptedPeerIds.has(peer.userId) : false;
}

function toMessageDto(row: MessageRow): MessageDto {
  return {
    id: row.id,
    roomId: row.roomId,
    authorId: row.authorId,
    body: row.deletedAt ? "" : row.body,
    mediaUrl: row.mediaUrl ?? null,
    clientMessageId: row.clientMessageId ?? null,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}
