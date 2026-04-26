import { Test } from "@nestjs/testing";
import { ErrorCode, NotificationType, ReactionType } from "@baydar/shared";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

import { ReactionsService } from "./reactions.service";

type PrismaStub = {
  post: { findFirst: jest.Mock };
  reaction: { upsert: jest.Mock; deleteMany: jest.Mock };
};

function buildPrisma(): PrismaStub {
  return {
    post: { findFirst: jest.fn() },
    reaction: { upsert: jest.fn(), deleteMany: jest.fn() },
  };
}

describe("ReactionsService", () => {
  let service: ReactionsService;
  let prisma: PrismaStub;
  let notifications: { notify: jest.Mock };

  beforeEach(async () => {
    prisma = buildPrisma();
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

  it("set: 404s when the post is missing or deleted", async () => {
    prisma.post.findFirst.mockResolvedValue(null);
    await expect(service.set("u1", "p_missing", ReactionType.LIKE)).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
    expect(prisma.reaction.upsert).not.toHaveBeenCalled();
  });

  it("set: upserts on (userId, postId) so a second like is idempotent", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "p1", authorId: "u_post" });
    await service.set("u1", "p1", ReactionType.LIKE);
    expect(prisma.reaction.upsert).toHaveBeenCalledWith({
      where: { userId_postId: { userId: "u1", postId: "p1" } },
      create: { userId: "u1", postId: "p1", type: ReactionType.LIKE },
      update: { type: ReactionType.LIKE },
    });
  });

  it("set: type swap (LIKE \u2192 CELEBRATE) reuses the same upsert path", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "p1", authorId: "u_post" });
    await service.set("u1", "p1", ReactionType.CELEBRATE);
    const call = prisma.reaction.upsert.mock.calls[0]?.[0] as {
      update: { type: ReactionType };
    };
    expect(call.update.type).toBe(ReactionType.CELEBRATE);
  });

  it("set: notifies the post author with dedupe and the chosen reaction type", async () => {
    prisma.post.findFirst.mockResolvedValue({ id: "p1", authorId: "u_post" });
    await service.set("u1", "p1", ReactionType.INSIGHTFUL);
    // Notify is fire-and-forget but synchronously enqueued; flush microtasks.
    await new Promise((r) => setImmediate(r));
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.POST_REACTION,
        recipientId: "u_post",
        actorId: "u1",
        postId: "p1",
        dedupe: true,
        data: { reactionType: ReactionType.INSIGHTFUL },
      }),
    );
  });

  it("clear: deletes any reaction for (userId, postId) idempotently", async () => {
    await service.clear("u1", "p1");
    expect(prisma.reaction.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u1", postId: "p1" },
    });
  });
});
