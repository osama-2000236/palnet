import { NotificationType } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { NotificationsBus } from "./notifications.bus";
import { NotificationsService } from "./notifications.service";
import { PushService } from "./push.service";

type PrismaStub = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  notification: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    updateMany: jest.Mock;
    count: jest.Mock;
  };
};

function buildPrisma(): PrismaStub {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue({ isActive: true, notificationPrefs: null }),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

function row(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "n_1",
    type: NotificationType.POST_REACTION,
    actorId: "u_actor",
    recipientId: "u_rec",
    postId: "p_1",
    commentId: null,
    connectionId: null,
    messageId: null,
    jobId: null,
    data: null,
    readAt: null,
    createdAt: new Date("2026-04-18T10:00:00Z"),
    actor: {
      id: "u_actor",
      profile: {
        handle: "actor",
        firstName: "Actor",
        lastName: "One",
        avatarUrl: null,
      },
    },
    ...overrides,
  };
}

describe("NotificationsService", () => {
  let service: NotificationsService;
  let prisma: PrismaStub;
  let bus: { publish: jest.Mock; subscribe: jest.Mock };
  let push: { sendNotification: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    bus = { publish: jest.fn(), subscribe: jest.fn() };
    push = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsBus, useValue: bus },
        { provide: PushService, useValue: push },
      ],
    }).compile();
    service = moduleRef.get(NotificationsService);
  });

  describe("notify", () => {
    it("skips self-notifications silently", async () => {
      await service.notify({
        type: NotificationType.POST_REACTION,
        recipientId: "u_1",
        actorId: "u_1",
        postId: "p_1",
      });
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(bus.publish).not.toHaveBeenCalled();
    });

    it("creates a notification and publishes new + unread-count events", async () => {
      prisma.notification.create.mockResolvedValue(row());
      prisma.notification.count.mockResolvedValue(1);

      await service.notify({
        type: NotificationType.POST_REACTION,
        recipientId: "u_rec",
        actorId: "u_actor",
        postId: "p_1",
      });
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(bus.publish).toHaveBeenCalledWith(
        "u_rec",
        expect.objectContaining({ type: "notification.new" }),
      );
      expect(push.sendNotification).toHaveBeenCalledWith(
        "u_rec",
        expect.objectContaining({ id: "n_1" }),
      );
      expect(bus.publish).toHaveBeenCalledWith(
        "u_rec",
        expect.objectContaining({
          type: "notification.unread-count",
          payload: { count: 1 },
        }),
      );
    });

    it("dedupes when an equivalent unread row already exists", async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: "already" });

      await service.notify({
        type: NotificationType.POST_REACTION,
        recipientId: "u_rec",
        actorId: "u_actor",
        postId: "p_1",
        dedupe: true,
      });
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(bus.publish).not.toHaveBeenCalled();
    });

    it("does not throw when Prisma create fails — notifications are fire-and-forget", async () => {
      prisma.notification.create.mockRejectedValue(new Error("db down"));
      await expect(
        service.notify({
          type: NotificationType.POST_REACTION,
          recipientId: "u_rec",
          actorId: "u_actor",
          postId: "p_1",
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("list", () => {
    it("returns newest-first with nextCursor when hasMore is true", async () => {
      const rows = [row({ id: "n_3" }), row({ id: "n_2" }), row({ id: "n_1" })];
      prisma.notification.findMany.mockResolvedValue(rows);
      const out = await service.list("u_rec", null, 2);
      expect(out.data.map((n) => n.id)).toEqual(["n_3", "n_2"]);
      expect(out.meta).toMatchObject({ hasMore: true, nextCursor: "n_2", limit: 2 });
    });
  });

  describe("markRead", () => {
    it("marks the given ids as read and publishes a read event", async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 2 });
      prisma.notification.count.mockResolvedValue(0);

      const out = await service.markRead("u_rec", { ids: ["n_1", "n_2"] });
      expect(out.count).toBe(2);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          recipientId: "u_rec",
          id: { in: ["n_1", "n_2"] },
          readAt: null,
        },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      });
      expect(bus.publish).toHaveBeenCalledWith(
        "u_rec",
        expect.objectContaining({ type: "notification.read" }),
      );
      expect(bus.publish).toHaveBeenCalledWith(
        "u_rec",
        expect.objectContaining({
          type: "notification.unread-count",
          payload: { count: 0 },
        }),
      );
    });

    it("supports all=true to mark every unread as read", async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });
      prisma.notification.count.mockResolvedValue(0);
      await service.markRead("u_rec", { all: true });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { recipientId: "u_rec", readAt: null },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      });
    });
  });

  describe("countUnread", () => {
    it("counts rows where readAt is null", async () => {
      prisma.notification.count.mockResolvedValue(7);
      const n = await service.countUnread("u_rec");
      expect(n).toBe(7);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { recipientId: "u_rec", readAt: null },
      });
    });
  });
});
