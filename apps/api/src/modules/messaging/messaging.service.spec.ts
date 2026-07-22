import { ErrorCode } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import { MessagingBus } from "./messaging.bus";
import { MessagingService } from "./messaging.service";

type PrismaStub = {
  user: { findUnique: jest.Mock };
  chatRoom: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  chatRoomMember: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    updateMany: jest.Mock;
  };
  connection: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
  message: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  blockedUser: { count: jest.Mock };
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
  $transaction: jest.Mock;
};

function buildPrisma(): PrismaStub {
  const prisma: PrismaStub = {
    user: { findUnique: jest.fn() },
    chatRoom: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    chatRoomMember: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    connection: {
      count: jest.fn(),
      // Accepted-connection lookup for the derived isRequest flag. Default:
      // no accepted connections — specific tests override per case.
      findMany: jest.fn().mockResolvedValue([]),
    },
    message: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    blockedUser: { count: jest.fn() },
    // Unread-counts batched query. Default to empty (zero unread) — specific
    // tests override per case.
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(),
  };
  // Run interactive transactions against the same stub so find/create mocks work.
  prisma.$transaction.mockImplementation(async (fn: (tx: PrismaStub) => Promise<unknown>) =>
    fn(prisma),
  );
  return prisma;
}

function roomRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "room_1",
    isGroup: false,
    title: null,
    updatedAt: new Date("2026-04-18T10:00:00Z"),
    members: [
      {
        userId: "u_me",
        lastReadAt: null,
        user: {
          profile: {
            handle: "me",
            firstName: "Me",
            lastName: "One",
            avatarUrl: null,
          },
        },
      },
      {
        userId: "u_them",
        lastReadAt: null,
        user: {
          profile: {
            handle: "them",
            firstName: "Them",
            lastName: "Two",
            avatarUrl: null,
          },
        },
      },
    ],
    messages: [],
    ...overrides,
  };
}

describe("MessagingService", () => {
  let service: MessagingService;
  let prisma: PrismaStub;
  let bus: { publish: jest.Mock; subscribe: jest.Mock };
  let notifications: { notify: jest.Mock };
  let safety: { getBlockedEitherIds: jest.Mock; isBlockedEither: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    bus = { publish: jest.fn(), subscribe: jest.fn() };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    safety = {
      getBlockedEitherIds: jest.fn().mockResolvedValue([]),
      isBlockedEither: jest.fn().mockResolvedValue(false),
    };
    prisma.blockedUser.count.mockResolvedValue(0);
    const moduleRef = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: prisma },
        { provide: MessagingBus, useValue: bus },
        { provide: NotificationsService, useValue: notifications },
        { provide: SafetyService, useValue: safety },
      ],
    }).compile();
    service = moduleRef.get(MessagingService);
  });

  describe("findOrCreateDm", () => {
    it("returns the existing 1:1 room when both users already share one", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u_them" });
      prisma.chatRoom.findFirst
        .mockResolvedValueOnce({ id: "room_1" }) // existence probe (inside tx)
        .mockResolvedValueOnce(roomRow()); // getRoomDto fetch
      prisma.message.count.mockResolvedValue(0);

      const result = await service.findOrCreateDm("u_me", "u_them");
      expect(result.id).toBe("room_1");
      expect(prisma.chatRoom.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it("creates a new room when none exists, with both users as members", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u_them" });
      prisma.chatRoom.findFirst
        .mockResolvedValueOnce(null) // no existing room (inside tx)
        .mockResolvedValueOnce(roomRow()); // post-create fetch
      prisma.chatRoom.create.mockResolvedValue({ id: "room_1" });
      prisma.message.count.mockResolvedValue(0);

      const result = await service.findOrCreateDm("u_me", "u_them");
      expect(prisma.chatRoom.create).toHaveBeenCalledWith({
        data: {
          isGroup: false,
          members: {
            create: [{ userId: "u_me" }, { userId: "u_them" }],
          },
        },
        select: { id: true },
      });
      expect(result.id).toBe("room_1");
    });

    it("rejects DM with self", async () => {
      await expect(service.findOrCreateDm("u_me", "u_me")).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
      });
    });

    it("404s when the other user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOrCreateDm("u_me", "u_ghost")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
    });

    it("rejects open-DM when either side has blocked the other", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u_them" });
      prisma.blockedUser.count.mockResolvedValue(1);

      await expect(service.findOrCreateDm("u_me", "u_them")).rejects.toMatchObject({
        code: ErrorCode.BLOCKED,
      });
      expect(prisma.chatRoom.create).not.toHaveBeenCalled();
    });
  });

  describe("sendMessage", () => {
    beforeEach(() => {
      prisma.chatRoomMember.findFirst.mockResolvedValue({ id: "m_1" });
      prisma.chatRoomMember.findMany.mockResolvedValue([{ userId: "u_me" }, { userId: "u_them" }]);
    });

    it("returns the existing message when the same clientMessageId is re-sent", async () => {
      const row = {
        id: "msg_1",
        roomId: "room_1",
        authorId: "u_me",
        body: "hello",
        mediaUrl: null,
        clientMessageId: "c_1",
        createdAt: new Date("2026-04-18T10:00:00Z"),
        editedAt: null,
        deletedAt: null,
      };
      prisma.message.findFirst.mockResolvedValue(row);

      const out = await service.sendMessage("u_me", "room_1", {
        body: "hello",
        clientMessageId: "c_1",
      });
      expect(out.id).toBe("msg_1");
      expect(prisma.message.create).not.toHaveBeenCalled();
      // A replay adds no content, so it must NOT un-archive: otherwise one
      // clientMessageId can be resent forever to undo the recipient's archive.
      expect(prisma.chatRoomMember.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roomId: "room_1", archivedAt: { not: null } },
          data: { archivedAt: null },
        }),
      );
    });

    it("returns the winner's message when a concurrent duplicate loses the unique race", async () => {
      const winner = {
        id: "msg_winner",
        roomId: "room_1",
        authorId: "u_me",
        body: "hello",
        mediaUrl: null,
        clientMessageId: "c_1",
        createdAt: new Date("2026-04-18T10:00:00Z"),
        editedAt: null,
        deletedAt: null,
      };
      // Pre-create check misses, insert hits the (roomId, authorId,
      // clientMessageId) unique, re-fetch finds the winner's row.
      prisma.message.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
      prisma.message.create.mockRejectedValue({ code: "P2002" });

      const out = await service.sendMessage("u_me", "room_1", {
        body: "hello",
        clientMessageId: "c_1",
      });
      expect(out.id).toBe("msg_winner");
    });

    it("creates a new message and fans out to every member", async () => {
      prisma.message.findFirst.mockResolvedValue(null);
      const created = {
        id: "msg_2",
        roomId: "room_1",
        authorId: "u_me",
        body: "hi",
        mediaUrl: null,
        clientMessageId: "c_2",
        createdAt: new Date("2026-04-18T10:00:00Z"),
        editedAt: null,
        deletedAt: null,
      };
      prisma.message.create.mockResolvedValue(created);
      prisma.chatRoom.update.mockResolvedValue({});

      const out = await service.sendMessage("u_me", "room_1", {
        body: "hi",
        clientMessageId: "c_2",
      });
      expect(out.id).toBe("msg_2");
      expect(bus.publish).toHaveBeenCalledTimes(2);
      expect(bus.publish).toHaveBeenCalledWith(
        "u_me",
        expect.objectContaining({ type: "message.new" }),
      );
      expect(bus.publish).toHaveBeenCalledWith(
        "u_them",
        expect.objectContaining({ type: "message.new" }),
      );
      expect(prisma.chatRoomMember.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roomId: "room_1", archivedAt: { not: null } },
          data: { archivedAt: null },
        }),
      );
    });

    it("trims body and rejects whitespace-only messages", async () => {
      await expect(
        service.sendMessage("u_me", "room_1", {
          body: "   ",
          clientMessageId: "c_blank",
        }),
      ).rejects.toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it("returns the raced winner when create hits P2002 on clientMessageId", async () => {
      prisma.message.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: "msg_race",
        roomId: "room_1",
        authorId: "u_me",
        body: "hi",
        mediaUrl: null,
        clientMessageId: "c_race",
        createdAt: new Date("2026-04-18T10:00:00Z"),
        editedAt: null,
        deletedAt: null,
      });
      prisma.message.create.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));

      const out = await service.sendMessage("u_me", "room_1", {
        body: "hi",
        clientMessageId: "c_race",
      });
      expect(out.id).toBe("msg_race");
      expect(bus.publish).not.toHaveBeenCalled();
    });

    it("404s when the viewer is not a member", async () => {
      prisma.chatRoomMember.findFirst.mockResolvedValue(null);
      await expect(
        service.sendMessage("u_stranger", "room_1", {
          body: "hi",
          clientMessageId: "c_3",
        }),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });

    it("rejects sends when either side has blocked the other", async () => {
      prisma.blockedUser.count.mockResolvedValue(1);

      await expect(
        service.sendMessage("u_me", "room_1", {
          body: "hi",
          clientMessageId: "c_blocked",
        }),
      ).rejects.toMatchObject({ code: ErrorCode.BLOCKED });
      expect(prisma.message.create).not.toHaveBeenCalled();
    });
  });

  describe("listMyRooms unread count", () => {
    it("returns the batched unread count produced by the single $queryRaw call", async () => {
      const lastRead = new Date("2026-04-18T09:00:00Z");
      prisma.chatRoom.findMany.mockResolvedValue([
        roomRow({
          members: [
            {
              userId: "u_me",
              lastReadAt: lastRead,
              lastReadMessageId: "msg_last",
              user: {
                profile: { handle: "me", firstName: "M", lastName: "E", avatarUrl: null },
              },
            },
            {
              userId: "u_them",
              lastReadAt: null,
              lastReadMessageId: null,
              user: {
                profile: { handle: "them", firstName: "T", lastName: "M", avatarUrl: null },
              },
            },
          ],
        }),
      ]);
      prisma.$queryRaw.mockResolvedValue([{ roomId: "room_1", unread: 3n }]);

      const out = await service.listMyRooms("u_me");
      expect(out[0]?.unreadCount).toBe(3);
      // The per-room loop was replaced with one batched SQL call.
      expect(prisma.message.count).not.toHaveBeenCalled();
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("defaults unread to 0 when the batched query returns nothing for a room", async () => {
      prisma.chatRoom.findMany.mockResolvedValue([roomRow()]);
      prisma.$queryRaw.mockResolvedValue([]);

      const out = await service.listMyRooms("u_me");
      expect(out[0]?.unreadCount).toBe(0);
    });

    it("flags 1:1 rooms with non-connections as message requests", async () => {
      prisma.chatRoom.findMany.mockResolvedValue([roomRow()]);
      prisma.connection.findMany.mockResolvedValue([]);

      const out = await service.listMyRooms("u_me");
      expect(out[0]?.isRequest).toBe(true);
    });

    it("keeps accepted-connection DMs and group rooms out of requests", async () => {
      prisma.chatRoom.findMany.mockResolvedValue([
        roomRow(),
        roomRow({ id: "room_group", isGroup: true, title: "Team" }),
      ]);
      prisma.connection.findMany.mockResolvedValue([{ requesterId: "u_me", receiverId: "u_them" }]);

      const out = await service.listMyRooms("u_me");
      expect(out.map((room) => room.isRequest)).toEqual([false, false]);
    });

    it("hides rooms archived by the viewer", async () => {
      prisma.chatRoom.findMany.mockResolvedValue([]);

      await service.listMyRooms("u_me");

      expect(prisma.chatRoom.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            members: { some: { userId: "u_me", archivedAt: null } },
          }),
        }),
      );
    });
  });

  describe("createGroupRoom", () => {
    it("creates a group room with accepted connections only", async () => {
      prisma.connection.count.mockResolvedValue(2);
      prisma.chatRoom.create.mockResolvedValue({ id: "room_group" });
      prisma.chatRoom.findFirst.mockResolvedValue(
        roomRow({
          id: "room_group",
          isGroup: true,
          title: "Launch room",
          members: [
            roomRow().members[0],
            {
              userId: "u_a",
              lastReadAt: null,
              user: {
                profile: { handle: "a", firstName: "A", lastName: "One", avatarUrl: null },
              },
            },
            {
              userId: "u_b",
              lastReadAt: null,
              user: {
                profile: { handle: "b", firstName: "B", lastName: "Two", avatarUrl: null },
              },
            },
          ],
        }),
      );
      prisma.message.count.mockResolvedValue(0);

      const out = await service.createGroupRoom("u_me", {
        isGroup: true,
        memberIds: ["u_a", "u_b"],
        title: "Launch room",
      });

      expect(out.isGroup).toBe(true);
      expect(prisma.chatRoom.create).toHaveBeenCalledWith({
        data: {
          isGroup: true,
          title: "Launch room",
          members: {
            create: [{ userId: "u_me" }, { userId: "u_a" }, { userId: "u_b" }],
          },
        },
        select: { id: true },
      });
    });

    it("rejects non-accepted group members", async () => {
      prisma.connection.count.mockResolvedValue(1);

      await expect(
        service.createGroupRoom("u_me", {
          isGroup: true,
          memberIds: ["u_a", "u_b"],
          title: "Launch room",
        }),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_FORBIDDEN });
    });
  });

  describe("markRead", () => {
    it("updates lastReadAt and publishes a read event to every member", async () => {
      prisma.chatRoomMember.findFirst.mockResolvedValue({ id: "m_1" });
      prisma.chatRoomMember.updateMany.mockResolvedValue({ count: 1 });
      prisma.chatRoomMember.findMany.mockResolvedValue([{ userId: "u_me" }, { userId: "u_them" }]);

      await service.markRead("u_me", "room_1");
      expect(prisma.chatRoomMember.updateMany).toHaveBeenCalledWith({
        where: { roomId: "room_1", userId: "u_me" },
        data: expect.objectContaining({ lastReadAt: expect.any(Date) }),
      });
      expect(bus.publish).toHaveBeenCalledTimes(2);
      expect(bus.publish).toHaveBeenCalledWith(
        "u_them",
        expect.objectContaining({ type: "message.read" }),
      );
    });
  });

  describe("archiveRoom", () => {
    it("marks only the viewer membership as archived", async () => {
      prisma.chatRoomMember.findFirst.mockResolvedValue({ id: "m_1" });
      prisma.chatRoomMember.updateMany.mockResolvedValue({ count: 1 });

      await service.archiveRoom("u_me", "room_1");

      expect(prisma.chatRoomMember.updateMany).toHaveBeenCalledWith({
        where: { roomId: "room_1", userId: "u_me" },
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      });
    });
  });

  describe("editMessage", () => {
    const baseMessage = {
      id: "msg_1",
      roomId: "room_1",
      authorId: "u_me",
      body: "before",
      mediaUrl: null,
      clientMessageId: "c_1",
      createdAt: new Date(),
      editedAt: null,
      deletedAt: null,
      room: { members: [{ userId: "u_me" }, { userId: "u_them" }] },
    };

    it("edits own message within the 15 minute window and fans out", async () => {
      prisma.message.findUnique.mockResolvedValue(baseMessage);
      prisma.message.update.mockResolvedValue({
        ...baseMessage,
        body: "after",
        editedAt: new Date("2026-04-18T10:01:00Z"),
      });

      const out = await service.editMessage("u_me", "msg_1", { body: "after" });

      expect(out.body).toBe("after");
      expect(out.editedAt).toBe("2026-04-18T10:01:00.000Z");
      expect(bus.publish).toHaveBeenCalledWith(
        "u_them",
        expect.objectContaining({ type: "message.edited" }),
      );
    });

    it("rejects edits from another room member", async () => {
      prisma.message.findUnique.mockResolvedValue(baseMessage);

      await expect(service.editMessage("u_them", "msg_1", { body: "nope" })).rejects.toMatchObject({
        code: ErrorCode.AUTH_FORBIDDEN,
      });
    });

    it("rejects edits after 15 minutes", async () => {
      prisma.message.findUnique.mockResolvedValue({
        ...baseMessage,
        createdAt: new Date(Date.now() - 16 * 60 * 1000),
      });

      await expect(service.editMessage("u_me", "msg_1", { body: "late" })).rejects.toMatchObject({
        code: ErrorCode.AUTH_FORBIDDEN,
      });
    });
  });

  describe("deleteMessage", () => {
    it("soft-deletes own message and hides the body in the DTO", async () => {
      const deletedAt = new Date("2026-04-18T10:02:00Z");
      const row = {
        id: "msg_1",
        roomId: "room_1",
        authorId: "u_me",
        body: "secret",
        mediaUrl: null,
        clientMessageId: "c_1",
        createdAt: new Date("2026-04-18T10:00:00Z"),
        editedAt: null,
        deletedAt: null,
        room: { members: [{ userId: "u_me" }, { userId: "u_them" }] },
      };
      prisma.message.findUnique.mockResolvedValue(row);
      prisma.message.update.mockResolvedValue({ ...row, deletedAt });

      const out = await service.deleteMessage("u_me", "msg_1");

      expect(out.body).toBe("");
      expect(out.deletedAt).toBe("2026-04-18T10:02:00.000Z");
      expect(bus.publish).toHaveBeenCalledWith(
        "u_them",
        expect.objectContaining({ type: "message.deleted" }),
      );
    });
  });
});
