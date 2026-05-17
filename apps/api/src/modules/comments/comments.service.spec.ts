import { ErrorCode, NotificationType } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SafetyService } from "../safety/safety.service";

import { CommentsService } from "./comments.service";

type PrismaStub = {
  post: { findFirst: jest.Mock };
  comment: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

function commentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "c_1",
    postId: "p_1",
    parentId: null,
    body: "hello",
    createdAt: new Date("2026-04-18T10:00:00Z"),
    updatedAt: new Date("2026-04-18T10:00:00Z"),
    author: {
      id: "u_author",
      deletedAt: null,
      profile: {
        handle: "author",
        firstName: "Author",
        lastName: "One",
        avatarUrl: null,
      },
    },
    ...overrides,
  };
}

describe("CommentsService", () => {
  let service: CommentsService;
  let prisma: PrismaStub;
  let notifications: { notify: jest.Mock };
  let safety: { getBlockedEitherIds: jest.Mock };

  beforeEach(async () => {
    prisma = {
      post: { findFirst: jest.fn() },
      comment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    safety = { getBlockedEitherIds: jest.fn().mockResolvedValue([]) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: SafetyService, useValue: safety },
      ],
    }).compile();
    service = moduleRef.get(CommentsService);
  });

  describe("create", () => {
    it("404s when the post is missing or soft-deleted", async () => {
      prisma.post.findFirst.mockResolvedValue(null);
      await expect(
        service.create("u_me", "p_missing", { body: "hi" }),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });

    it("404s when a parentId is passed but the parent comment does not belong to the post", async () => {
      prisma.post.findFirst.mockResolvedValue({ id: "p_1", authorId: "u_author" });
      prisma.comment.findFirst.mockResolvedValue(null);
      await expect(
        service.create("u_me", "p_1", { body: "reply", parentId: "c_missing" }),
      ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    });

    it("notifies the post author on a top-level comment", async () => {
      prisma.post.findFirst.mockResolvedValue({ id: "p_1", authorId: "u_author" });
      prisma.comment.create.mockResolvedValue(commentRow());

      await service.create("u_me", "p_1", { body: "hello" });

      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.POST_COMMENT,
          recipientId: "u_author",
          actorId: "u_me",
          postId: "p_1",
        }),
      );
    });

    it("also notifies the parent-comment author when it differs from the post author", async () => {
      prisma.post.findFirst.mockResolvedValue({ id: "p_1", authorId: "u_author" });
      prisma.comment.findFirst.mockResolvedValue({ id: "c_parent", authorId: "u_other" });
      prisma.comment.create.mockResolvedValue(commentRow({ parentId: "c_parent" }));

      await service.create("u_me", "p_1", { body: "reply", parentId: "c_parent" });

      const recipients = notifications.notify.mock.calls.map(
        (call: unknown[]) => (call[0] as { recipientId: string }).recipientId,
      );
      expect(recipients).toEqual(expect.arrayContaining(["u_author", "u_other"]));
    });

    it("skips the duplicate notification when parent author equals post author", async () => {
      prisma.post.findFirst.mockResolvedValue({ id: "p_1", authorId: "u_author" });
      prisma.comment.findFirst.mockResolvedValue({ id: "c_parent", authorId: "u_author" });
      prisma.comment.create.mockResolvedValue(commentRow({ parentId: "c_parent" }));

      await service.create("u_me", "p_1", { body: "reply", parentId: "c_parent" });

      expect(notifications.notify).toHaveBeenCalledTimes(1);
    });
  });

  describe("list", () => {
    it("returns top-level comments ordered chronologically with hasMore + nextCursor", async () => {
      prisma.comment.findMany.mockResolvedValue([
        commentRow({ id: "c_1" }),
        commentRow({ id: "c_2" }),
        commentRow({ id: "c_3" }),
      ]);

      const out = await service.list("u_me", "p_1", null, 2);

      expect(out.data.map((c) => c.id)).toEqual(["c_1", "c_2"]);
      expect(out.meta).toMatchObject({ hasMore: true, nextCursor: "c_2", limit: 2 });
    });

    it("filters out comments authored by blocked users", async () => {
      safety.getBlockedEitherIds.mockResolvedValue(["u_blocked"]);
      prisma.comment.findMany.mockResolvedValue([]);

      await service.list("u_me", "p_1", null, 20);

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: { notIn: ["u_blocked"] },
          }),
        }),
      );
    });

    it("masks a deleted author's identity in the DTO", async () => {
      prisma.comment.findMany.mockResolvedValue([
        commentRow({
          id: "c_deleted",
          author: {
            id: "u_gone",
            deletedAt: new Date(),
            profile: null,
          },
        }),
      ]);

      const out = await service.list("u_me", "p_1", null, 20);

      expect(out.data[0]?.author).toMatchObject({
        firstName: "Deleted user",
        lastName: "",
        avatarUrl: null,
      });
    });
  });

  describe("delete", () => {
    it("403s when the viewer is not the author", async () => {
      prisma.comment.findFirst.mockResolvedValue({ id: "c_1", authorId: "u_other" });
      await expect(service.delete("u_me", "c_1")).rejects.toMatchObject({
        code: ErrorCode.AUTH_FORBIDDEN,
      });
      expect(prisma.comment.update).not.toHaveBeenCalled();
    });

    it("soft-deletes by stamping deletedAt", async () => {
      prisma.comment.findFirst.mockResolvedValue({ id: "c_1", authorId: "u_me" });
      await service.delete("u_me", "c_1");
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: "c_1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      });
    });
  });
});
