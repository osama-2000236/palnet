import { ErrorCode, NotificationType } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import { ReactionsService } from "./reactions.service";

type PrismaStub = {
  post: { findFirst: jest.Mock };
  reaction: { upsert: jest.Mock; deleteMany: jest.Mock };
};

describe("ReactionsService", () => {
  let service: ReactionsService;
  let prisma: PrismaStub;
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = {
      post: { findFirst: jest.fn() },
      reaction: { upsert: jest.fn(), deleteMany: jest.fn() },
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = moduleRef.get(ReactionsService);
  });

  describe("set", () => {
    it("404s when the post does not exist", async () => {
      prisma.post.findFirst.mockResolvedValue(null);
      await expect(service.set("u_me", "p_missing", "LIKE")).rejects.toMatchObject({
        code: ErrorCode.NOT_FOUND,
      });
      expect(prisma.reaction.upsert).not.toHaveBeenCalled();
    });

    it("upserts the reaction so toggling between types stays a single row", async () => {
      prisma.post.findFirst.mockResolvedValue({ id: "p_1", authorId: "u_author" });
      prisma.reaction.upsert.mockResolvedValue({});

      await service.set("u_me", "p_1", "CELEBRATE");

      expect(prisma.reaction.upsert).toHaveBeenCalledWith({
        where: { userId_postId: { userId: "u_me", postId: "p_1" } },
        create: { userId: "u_me", postId: "p_1", type: "CELEBRATE" },
        update: { type: "CELEBRATE" },
      });
    });

    it("emits a deduped POST_REACTION notification to the author", async () => {
      prisma.post.findFirst.mockResolvedValue({ id: "p_1", authorId: "u_author" });
      prisma.reaction.upsert.mockResolvedValue({});

      await service.set("u_me", "p_1", "LIKE");

      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.POST_REACTION,
          recipientId: "u_author",
          actorId: "u_me",
          postId: "p_1",
          dedupe: true,
        }),
      );
    });
  });

  describe("clear", () => {
    it("deletes the viewer's reaction on the post", async () => {
      prisma.reaction.deleteMany.mockResolvedValue({ count: 1 });
      await service.clear("u_me", "p_1");
      expect(prisma.reaction.deleteMany).toHaveBeenCalledWith({
        where: { userId: "u_me", postId: "p_1" },
      });
    });
  });
});
