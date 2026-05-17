import { ErrorCode, NotificationType } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import { NotificationsBus } from "./notifications.bus";
import { NotificationsService } from "./notifications.service";
import { PushService } from "./push.service";

type PrismaStub = {
  notification: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    updateMany: jest.Mock;
    count: jest.Mock;
  };
  $transaction: jest.Mock;
};

function buildPrisma(): PrismaStub {
  const notification = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  };
  return {
    notification,
    // Default: resolve to whatever the per-test mock returns by treating each
    // operation as a no-op. Specific specs override this to return the
    // (updateMany.result, count) tuple the service expects.
    $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
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
  let safety: { isBlockedEither: jest.Mock; getBlockedEitherIds: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
    bus = { publish: jest.fn(), subscribe: jest.fn() };
    push = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    safety = {
      isBlockedEither: jest.fn().mockResolvedValue(false),
      getBlockedEitherIds: jest.fn().mockResolvedValue([]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsBus, useValue: bus },
        { provide: PushService, useValue: push },
        { provide: SafetyService, useValue: safety },
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

    it("creates a notification and broadcasts the new event (count handled by client)", async () => {
      prisma.notification.create.mockResolvedValue(row());

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
      // The post-create unread-count broadcast was removed in favour of
      // having the client increment locally; the next markRead/dismiss
      // resync provides the authoritative number.
      expect(bus.publish).not.toHaveBeenCalledWith(
        "u_rec",
        expect.objectContaining({ type: "notification.unread-count" }),
      );
    });

    it("dedupes by stable key lookup instead of a 10-field findFirst", async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: "already" });

      await service.notify({
        type: NotificationType.POST_REACTION,
        recipientId: "u_rec",
        actorId: "u_actor",
        postId: "p_1",
        dedupe: true,
      });
      expect(prisma.notification.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientId: "u_rec",
            dedupeKey: "POST_REACTION:u_actor:p_1::::",
            readAt: null,
            dismissedAt: null,
          }),
        }),
      );
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(bus.publish).not.toHaveBeenCalled();
    });

    it("persists dedupeKey on the created row when dedupe is enabled", async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      prisma.notification.create.mockResolvedValue(row());

      await service.notify({
        type: NotificationType.POST_REACTION,
        recipientId: "u_rec",
        actorId: "u_actor",
        postId: "p_1",
        dedupe: true,
      });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dedupeKey: "POST_REACTION:u_actor:p_1::::",
          }),
        }),
      );
    });

    it("does not create notifications between blocked users", async () => {
      safety.isBlockedEither.mockResolvedValue(true);

      await service.notify({
        type: NotificationType.POST_REACTION,
        recipientId: "u_rec",
        actorId: "u_actor",
        postId: "p_1",
      });
      expect(prisma.notification.create).not.toHaveBeenCalled();
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

    it("excludes dismissed notifications from the list query", async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      await service.list("u_rec", null, 20);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientId: "u_rec",
            dismissedAt: null,
          }),
        }),
      );
    });
  });

  describe("markRead", () => {
    it("marks the given ids as read in a single transaction and re-counts unread", async () => {
      prisma.$transaction.mockResolvedValue([{ count: 2 }, 0]);

      const out = await service.markRead("u_rec", { ids: ["n_1", "n_2"] });
      expect(out.count).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
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
      prisma.$transaction.mockResolvedValue([{ count: 5 }, 0]);
      await service.markRead("u_rec", { all: true });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("countUnread", () => {
    it("counts rows where readAt is null", async () => {
      prisma.notification.count.mockResolvedValue(7);
      const n = await service.countUnread("u_rec");
      expect(n).toBe(7);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { recipientId: "u_rec", readAt: null, dismissedAt: null },
      });
    });
  });

  describe("dismiss", () => {
    it("soft-dismisses an owned notification and republishes unread count", async () => {
      prisma.$transaction.mockResolvedValue([{ count: 1 }, 3]);

      await service.dismiss("u_rec", "n_1");

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(bus.publish).toHaveBeenCalledWith("u_rec", {
        type: "notification.unread-count",
        payload: { count: 3 },
      });
    });

    it("enforces owner scope by returning not found when no row matches viewer", async () => {
      prisma.$transaction.mockResolvedValue([{ count: 0 }, 0]);

      await expect(service.dismiss("u_other", "n_1")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
      expect(bus.publish).not.toHaveBeenCalled();
    });
  });
});
